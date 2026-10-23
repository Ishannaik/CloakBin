/**
 * In-memory account store. Accounts vanish on restart, like memory-mode pastes.
 */
import { nanoid } from 'nanoid';
import type { Result } from '../types';
import type { AccountStore, Invite, Session, User } from './types';

const ok = <T>(data: T): Result<T> => ({ success: true, data });

export class MemoryAccountStore implements AccountStore {
	private users = new Map<string, User>();
	private sessions = new Map<string, Session>();
	private invites = new Map<string, Invite>();

	async createUser(input: { username: string; passwordHash: string }): Promise<Result<User>> {
		for (const u of this.users.values()) {
			if (u.username === input.username) return { success: false, error: 'username_taken' };
		}
		const user: User = {
			id: nanoid(12),
			username: input.username,
			passwordHash: input.passwordHash,
			createdAt: new Date(),
			lastLoginAt: null
		};
		this.users.set(user.id, user);
		return ok({ ...user });
	}

	async getUserById(id: string): Promise<Result<User | null>> {
		const u = this.users.get(id);
		return ok(u ? { ...u } : null);
	}

	async getUserByUsername(username: string): Promise<Result<User | null>> {
		for (const u of this.users.values()) {
			if (u.username === username) return ok({ ...u });
		}
		return ok(null);
	}

	async listUsers(): Promise<Result<User[]>> {
		return ok(
			[...this.users.values()]
				.map((u) => ({ ...u }))
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
		);
	}

	async deleteUser(id: string): Promise<Result<void>> {
		this.users.delete(id);
		for (const [hash, s] of this.sessions) {
			if (s.userId === id) this.sessions.delete(hash);
		}
		return ok(undefined);
	}

	async touchLogin(id: string, at: Date): Promise<Result<void>> {
		const u = this.users.get(id);
		if (u) u.lastLoginAt = at;
		return ok(undefined);
	}

	async createSession(session: Session): Promise<Result<void>> {
		this.sessions.set(session.tokenHash, { ...session });
		return ok(undefined);
	}

	async getSession(tokenHash: string): Promise<Result<Session | null>> {
		const s = this.sessions.get(tokenHash);
		if (!s) return ok(null);
		if (s.expiresAt <= new Date()) {
			this.sessions.delete(tokenHash);
			return ok(null);
		}
		return ok({ ...s });
	}

	async deleteSession(tokenHash: string): Promise<Result<void>> {
		this.sessions.delete(tokenHash);
		return ok(undefined);
	}

	async createInvite(invite: Invite): Promise<Result<void>> {
		this.invites.set(invite.id, { ...invite });
		return ok(undefined);
	}

	private liveInvite(tokenHash: string): Invite | null {
		for (const inv of this.invites.values()) {
			if (inv.tokenHash === tokenHash) {
				if (inv.expiresAt <= new Date()) {
					this.invites.delete(inv.id);
					return null;
				}
				return inv;
			}
		}
		return null;
	}

	async findInvite(tokenHash: string): Promise<Result<Invite | null>> {
		const inv = this.liveInvite(tokenHash);
		return ok(inv ? { ...inv } : null);
	}

	async consumeInvite(tokenHash: string): Promise<Result<Invite | null>> {
		// Single-threaded event loop: find + delete with no await between them is atomic.
		const inv = this.liveInvite(tokenHash);
		if (!inv) return ok(null);
		this.invites.delete(inv.id);
		return ok({ ...inv });
	}

	async listInvites(): Promise<Result<Invite[]>> {
		const now = new Date();
		return ok(
			[...this.invites.values()]
				.filter((i) => i.expiresAt > now)
				.map((i) => ({ ...i }))
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
		);
	}

	async deleteInvite(id: string): Promise<Result<void>> {
		this.invites.delete(id);
		return ok(undefined);
	}
}
