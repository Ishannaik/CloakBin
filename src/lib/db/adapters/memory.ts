/**
 * In-Memory Adapter for CloakBin
 * For testing and development - no persistence
 */

import { nanoid } from 'nanoid';
import type { DatabaseAdapter, CreatePasteInput, Paste, Result } from '../types';

export class MemoryAdapter implements DatabaseAdapter {
	private pastes: Map<string, Paste> = new Map();

	async createPaste(input: CreatePasteInput): Promise<Result<{ id: string }>> {
		const id = nanoid(8);
		const paste: Paste = {
			id,
			content: input.content,
			createdAt: new Date(),
			expiresAt: input.expiresAt,
			// No viewCount - privacy first
			hasPassword: input.hasPassword ?? false,
			salt: input.salt ?? null,
			burnAfterRead: input.burnAfterRead ?? false
		};
		this.pastes.set(id, paste);
		return { success: true, data: { id } };
	}

	async getPaste(id: string): Promise<Result<Paste | null>> {
		const paste = this.pastes.get(id);

		if (!paste) {
			return { success: true, data: null };
		}

		// Check if expired
		const now = new Date();
		if (paste.expiresAt < now) {
			this.pastes.delete(id);
			return { success: true, data: null };
		}

		// NOTE: Do NOT delete burn-after-read pastes here!
		// The client shows a warning first, then calls DELETE explicitly after user confirms.
		return { success: true, data: paste };
	}

	async deletePaste(id: string): Promise<Result<void>> {
		this.pastes.delete(id);
		return { success: true, data: undefined };
	}

	async cleanupExpired(): Promise<Result<{ deleted: number }>> {
		const now = new Date();
		let deleted = 0;

		for (const [id, paste] of this.pastes.entries()) {
			if (paste.expiresAt < now) {
				this.pastes.delete(id);
				deleted++;
			}
		}

		return { success: true, data: { deleted } };
	}

	async healthCheck(): Promise<Result<void>> {
		// In-memory is always healthy
		return { success: true, data: undefined };
	}
}
