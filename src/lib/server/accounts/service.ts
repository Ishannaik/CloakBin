/**
 * Member accounts: sign-in, sessions and invite links.
 *
 * SECURITY: the cookie holds a random 256-bit token; the store keeps only its
 * sha256, so a leaked database cannot be replayed as live sessions. Invite
 * links work the same way and are single-use.
 * The store is passed in, so this module has no $env/$lib imports and is unit-testable.
 */
import { createHash, randomBytes } from 'crypto';
import { nanoid } from 'nanoid';
import type { AccountStore, Invite, User } from '$lib/db/accounts/types';
import { hashPassword, verifyPassword } from './password';

export const SESSION_COOKIE = 'cb_session';
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const INVITE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const USERNAME_RE = /^[a-z0-9][a-z0-9_.-]{2,31}$/;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;

export type SessionUser = { id: string; username: string };

export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export function normalizeUsername(raw: string): string {
	return raw.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
	return USERNAME_RE.test(username)
		? null
		: 'Username must be 3-32 characters: lowercase letters, numbers, dot, dash or underscore';
}

export function validatePassword(password: string): string | null {
	if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
	if (password.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters`;
	return null;
}

// ---------------------------------------------------------------------------
// Per-username lockout
// ---------------------------------------------------------------------------
// WHY: the IP rate limit in hooks trusts X-Forwarded-For, which a client can
// set itself when no proxy rewrites it. Capping failures per username stops a
// password guesser who rotates fake IPs.
const LOCKOUT_MAX_FAILURES = 10;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

function isLockedOut(username: string, now: number): boolean {
	const entry = failures.get(username);
	if (!entry) return false;
	if (now > entry.resetAt) {
		failures.delete(username);
		return false;
	}
	return entry.count >= LOCKOUT_MAX_FAILURES;
}

function recordFailure(username: string, now: number): void {
	if (failures.size > 10_000) {
		for (const [key, e] of failures) if (now > e.resetAt) failures.delete(key);
	}
	const entry = failures.get(username);
	if (!entry || now > entry.resetAt) {
		failures.set(username, { count: 1, resetAt: now + LOCKOUT_WINDOW_MS });
	} else {
		entry.count++;
	}
}

/** Test hook: forget all recorded failures. */
export function resetLockouts(): void {
	failures.clear();
}

// Hash checked against when the username does not exist, so a miss costs the
// same time as a wrong password and does not reveal which usernames exist.
let dummyHash: Promise<string> | null = null;

export type LoginResult =
	| { ok: true; token: string; user: SessionUser }
	| { ok: false; reason: 'invalid' | 'locked' | 'error' };

export async function login(
	store: AccountStore,
	rawUsername: string,
	password: string,
	now: Date = new Date()
): Promise<LoginResult> {
	const username = normalizeUsername(rawUsername);
	if (isLockedOut(username, now.getTime())) return { ok: false, reason: 'locked' };
	// SECURITY: count the attempt before the first await. Parallel requests would
	// otherwise all pass the lockout check before any failure is recorded.
	// A successful sign-in clears it below.
	recordFailure(username, now.getTime());

	const found = await store.getUserByUsername(username);
	if (!found.success) return { ok: false, reason: 'error' };
	const user = found.data;

	dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
	const valid = await verifyPassword(password, user ? user.passwordHash : await dummyHash);
	if (!user || !valid) return { ok: false, reason: 'invalid' };

	failures.delete(username);
	const token = await startSession(store, user.id, now);
	if (!token) return { ok: false, reason: 'error' };
	await store.touchLogin(user.id, now);
	return { ok: true, token, user: { id: user.id, username: user.username } };
}

async function startSession(
	store: AccountStore,
	userId: string,
	now: Date
): Promise<string | null> {
	const token = randomBytes(32).toString('base64url');
	const created = await store.createSession({
		tokenHash: hashToken(token),
		userId,
		expiresAt: new Date(now.getTime() + SESSION_MAX_AGE_MS)
	});
	return created.success ? token : null;
}

/** Resolve a session cookie to its user. Deleted users and expired sessions resolve to null. */
export async function resolveSession(
	store: AccountStore,
	token: string
): Promise<SessionUser | null> {
	// Tokens are 43 base64url chars; reject junk before touching the store.
	if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
	const session = await store.getSession(hashToken(token));
	if (!session.success || !session.data) return null;
	const user = await store.getUserById(session.data.userId);
	if (!user.success || !user.data) return null;
	return { id: user.data.id, username: user.data.username };
}

export async function logout(store: AccountStore, token: string): Promise<void> {
	await store.deleteSession(hashToken(token));
}

/** Create an invite. Returns the raw token for the link; only its hash is stored. */
export async function createInvite(
	store: AccountStore,
	now: Date = new Date()
): Promise<{ token: string; invite: Invite } | null> {
	const token = randomBytes(24).toString('base64url');
	const invite: Invite = {
		id: nanoid(10),
		tokenHash: hashToken(token),
		createdAt: now,
		expiresAt: new Date(now.getTime() + INVITE_MAX_AGE_MS)
	};
	const saved = await store.createInvite(invite);
	return saved.success ? { token, invite } : null;
}

export async function isInviteValid(store: AccountStore, token: string): Promise<boolean> {
	const found = await store.findInvite(hashToken(token));
	return found.success && found.data !== null;
}

export type RedeemResult =
	| { ok: true; token: string; user: SessionUser }
	| { ok: false; error: string };

/** Turn an invite into an account and sign the new member in. */
export async function redeemInvite(
	store: AccountStore,
	inviteToken: string,
	rawUsername: string,
	password: string,
	now: Date = new Date()
): Promise<RedeemResult> {
	const username = normalizeUsername(rawUsername);
	const problem = validateUsername(username) ?? validatePassword(password);
	if (problem) return { ok: false, error: problem };

	const existing = await store.getUserByUsername(username);
	if (!existing.success) return { ok: false, error: 'Something went wrong. Try again.' };
	if (existing.data) return { ok: false, error: 'That username is taken' };

	const passwordHash = await hashPassword(password);
	const consumed = await store.consumeInvite(hashToken(inviteToken));
	if (!consumed.success) return { ok: false, error: 'Something went wrong. Try again.' };
	if (!consumed.data) return { ok: false, error: 'This invite link is invalid or has expired' };

	const created = await store.createUser({ username, passwordHash });
	if (!created.success) {
		// Put the invite back so a lost race on the username does not burn the link.
		await store.createInvite(consumed.data);
		return {
			ok: false,
			error:
				created.error === 'username_taken'
					? 'That username is taken'
					: 'Something went wrong. Try again.'
		};
	}

	const token = await startSession(store, created.data.id, now);
	if (!token)
		return { ok: false, error: 'Account created, but sign-in failed. Sign in on the login page.' };
	await store.touchLogin(created.data.id, now);
	return { ok: true, token, user: { id: created.data.id, username: created.data.username } };
}

export type { User };
