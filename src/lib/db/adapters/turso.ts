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
  view_count INTEGER DEFAULT 0,
  has_password INTEGER DEFAULT 0,
  salt TEXT,
  burn_after_read INTEGER DEFAULT 0
);

CREATE INDEX idx_pastes_expires_at ON pastes(expires_at);
*/

export class TursoAdapter implements DatabaseAdapter {
	// TODO: Initialize libsql client
	// - url: process.env.TURSO_DATABASE_URL
	// - authToken: process.env.TURSO_AUTH_TOKEN

	async createPaste(input: CreatePasteInput): Promise<Result<{ id: string }>> {
		// TODO: Implement
		// - Generate unique ID with nanoid
		// - INSERT INTO pastes (content, expires_at, has_password, salt, burn_after_read)
		// - Default values: has_password=0, salt=null, burn_after_read=0
		// - Note: SQLite uses INTEGER for booleans (0=false, 1=true)
		throw new Error('TODO: Implement createPaste');
	}

	async getPaste(id: string): Promise<Result<Paste | null>> {
		// TODO: Implement
		// - SELECT WHERE id = ? AND expires_at > datetime('now')
		// - UPDATE view_count = view_count + 1
		// - If burn_after_read is 1, DELETE the paste after reading
		// - Convert INTEGER to boolean for has_password and burn_after_read
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
