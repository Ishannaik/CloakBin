/**
 * Turso/LibSQL Adapter for CloakBin
 * Edge-friendly SQLite (great for Vercel/Cloudflare)
 */

import type { DatabaseAdapter, CreatePasteInput, Paste, Result } from '../types';

// TODO: Add libsql client: pnpm add @libsql/client
// TODO: Use TURSO_DATABASE_URL and TURSO_AUTH_TOKEN from environment

/*
CREATE TABLE pastes (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  view_count INTEGER DEFAULT 0
);

CREATE INDEX idx_pastes_expires_at ON pastes(expires_at);
*/

export class TursoAdapter implements DatabaseAdapter {
	// TODO: Initialize libsql client
	// - url: process.env.TURSO_DATABASE_URL
	// - authToken: process.env.TURSO_AUTH_TOKEN

	async createPaste(input: CreatePasteInput): Promise<Result<{ id: string }>> {
		// TODO: Implement
		throw new Error('TODO: Implement createPaste');
	}

	async getPaste(id: string): Promise<Result<Paste | null>> {
		// TODO: Implement
		throw new Error('TODO: Implement getPaste');
	}

	async deletePaste(id: string): Promise<Result<void>> {
		// TODO: Implement
		throw new Error('TODO: Implement deletePaste');
	}

	async cleanupExpired(): Promise<Result<{ deleted: number }>> {
		// TODO: Implement
		throw new Error('TODO: Implement cleanupExpired');
	}

	async healthCheck(): Promise<Result<void>> {
		// TODO: Implement
		throw new Error('TODO: Implement healthCheck');
	}
}
