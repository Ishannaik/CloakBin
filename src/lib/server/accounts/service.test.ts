import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryAccountStore } from '$lib/db/accounts/memory';
import { hashPassword, verifyPassword } from './password';
import {
	createInvite,
	hashToken,
	INVITE_MAX_AGE_MS,
	isInviteValid,
	login,
	logout,
	redeemInvite,
	resetLockouts,
	resolveSession
} from './service';

const PASSWORD = 'correct horse battery';

async function memberWithSession(store: MemoryAccountStore, username = 'alice') {
	const invite = await createInvite(store);
	if (!invite) throw new Error('invite failed');
	const joined = await redeemInvite(store, invite.token, username, PASSWORD);
	if (!joined.ok) throw new Error(joined.error);
	return joined;
}

describe('password hashing', () => {
	it('verifies the right password and rejects a wrong one', async () => {
		const hash = await hashPassword(PASSWORD);
		expect(hash.startsWith('scrypt$')).toBe(true);
		expect(hash).not.toContain(PASSWORD);
		expect(await verifyPassword(PASSWORD, hash)).toBe(true);
		expect(await verifyPassword('wrong password!', hash)).toBe(false);
		expect(await verifyPassword(PASSWORD, 'garbage')).toBe(false);
	});
});

describe('invites', () => {
	let store: MemoryAccountStore;
	beforeEach(() => {
		store = new MemoryAccountStore();
		resetLockouts();
	});

	it('creates an account and a working session from an invite', async () => {
		const joined = await memberWithSession(store);
		expect(joined.user.username).toBe('alice');
		expect(await resolveSession(store, joined.token)).toEqual(joined.user);
	});

	it('stores only token hashes, never raw tokens', async () => {
		const invite = await createInvite(store);
		const listed = await store.listInvites();
		expect(JSON.stringify(listed)).not.toContain(invite!.token);
		expect(invite!.invite.tokenHash).toBe(hashToken(invite!.token));
	});

	it('works only once', async () => {
		const invite = await createInvite(store);
		expect((await redeemInvite(store, invite!.token, 'alice', PASSWORD)).ok).toBe(true);
		const again = await redeemInvite(store, invite!.token, 'bob', PASSWORD);
		expect(again).toEqual({ ok: false, error: expect.stringMatching(/invalid or has expired/) });
	});

	it('rejects an expired invite', async () => {
		const past = new Date(Date.now() - INVITE_MAX_AGE_MS - 1000);
		const invite = await createInvite(store, past);
		expect(await isInviteValid(store, invite!.token)).toBe(false);
		expect((await redeemInvite(store, invite!.token, 'alice', PASSWORD)).ok).toBe(false);
	});

	it('keeps the invite usable when the username is taken or invalid', async () => {
		await memberWithSession(store, 'alice');
		const invite = await createInvite(store);
		expect((await redeemInvite(store, invite!.token, 'ALICE', PASSWORD)).ok).toBe(false);
		expect((await redeemInvite(store, invite!.token, 'x', PASSWORD)).ok).toBe(false);
		expect((await redeemInvite(store, invite!.token, 'bob', 'short')).ok).toBe(false);
		expect(await isInviteValid(store, invite!.token)).toBe(true);
	});
});

describe('login and sessions', () => {
	let store: MemoryAccountStore;
	beforeEach(() => {
		store = new MemoryAccountStore();
		resetLockouts();
	});

	it('signs in with the right password, case-insensitive username', async () => {
		await memberWithSession(store);
		const result = await login(store, ' Alice ', PASSWORD);
		expect(result.ok).toBe(true);
		if (result.ok) expect(await resolveSession(store, result.token)).toEqual(result.user);
	});

	it('gives the same answer for a wrong password and an unknown user', async () => {
		await memberWithSession(store);
		expect(await login(store, 'alice', 'not the password')).toEqual({ ok: false, reason: 'invalid' });
		expect(await login(store, 'nobody', PASSWORD)).toEqual({ ok: false, reason: 'invalid' });
	});

	it('locks a username after 10 failures, even with the right password', async () => {
		await memberWithSession(store);
		for (let i = 0; i < 10; i++) await login(store, 'alice', 'wrong password ' + i);
		expect(await login(store, 'alice', PASSWORD)).toEqual({ ok: false, reason: 'locked' });
	});

	it('counts parallel attempts toward the lockout', async () => {
		await memberWithSession(store);
		// The 11th parallel attempt has the right password; it must still be refused.
		const guesses = [...Array.from({ length: 10 }, (_, i) => 'wrong password ' + i), PASSWORD];
		const results = await Promise.all(guesses.map((p) => login(store, 'alice', p)));
		expect(results[10]).toEqual({ ok: false, reason: 'locked' });
	});

	it('ends the session on logout', async () => {
		const joined = await memberWithSession(store);
		await logout(store, joined.token);
		expect(await resolveSession(store, joined.token)).toBeNull();
	});

	it('ends every session when the admin deletes the user', async () => {
		const joined = await memberWithSession(store);
		await store.deleteUser(joined.user.id);
		expect(await resolveSession(store, joined.token)).toBeNull();
	});

	it('ignores malformed or unknown tokens', async () => {
		expect(await resolveSession(store, '')).toBeNull();
		expect(await resolveSession(store, 'not-a-token')).toBeNull();
		expect(await resolveSession(store, 'A'.repeat(43))).toBeNull();
	});
});
