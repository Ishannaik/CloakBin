/**
 * Account storage types (invite-only member accounts for self-hosted instances).
 *
 * Accounts only gate who may CREATE pastes. They never touch paste content or
 * keys: pastes stay encrypted in the browser and readable by anyone with the link.
 */
import type { Result } from '../types';

export interface User {
	id: string;
	username: string; // lowercase, unique
	passwordHash: string; // scrypt, see $lib/server/accounts/password
	createdAt: Date;
	lastLoginAt: Date | null;
}

export interface Session {
	tokenHash: string; // sha256 of the cookie token; the raw token is never stored
	userId: string;
	expiresAt: Date;
}

export interface Invite {
	id: string; // public id, used by the admin to revoke
	tokenHash: string; // sha256 of the token in the invite link
	createdAt: Date;
	expiresAt: Date;
}

export interface AccountStore {
	/** Fails with error 'username_taken' when the username already exists. */
	createUser(input: { username: string; passwordHash: string }): Promise<Result<User>>;
	getUserById(id: string): Promise<Result<User | null>>;
	getUserByUsername(username: string): Promise<Result<User | null>>;
	listUsers(): Promise<Result<User[]>>;
	/** Deletes the user and every session they hold. */
	deleteUser(id: string): Promise<Result<void>>;
	touchLogin(id: string, at: Date): Promise<Result<void>>;

	createSession(session: Session): Promise<Result<void>>;
	/** Returns null when the session is missing or expired. */
	getSession(tokenHash: string): Promise<Result<Session | null>>;
	deleteSession(tokenHash: string): Promise<Result<void>>;

	createInvite(invite: Invite): Promise<Result<void>>;
	/** Unexpired invite matching the token hash, without consuming it. */
	findInvite(tokenHash: string): Promise<Result<Invite | null>>;
	/** Atomically removes and returns an unexpired invite, so a link works once. */
	consumeInvite(tokenHash: string): Promise<Result<Invite | null>>;
	listInvites(): Promise<Result<Invite[]>>;
	deleteInvite(id: string): Promise<Result<void>>;
}
