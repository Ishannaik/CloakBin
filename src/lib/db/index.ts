/**
 * Database Adapter Export
 * Requires explicit database selection via environment variables
 */

import { env } from '$env/dynamic/private';
import type { DatabaseAdapter } from './types';
import { MemoryAdapter } from './adapters/memory';
import { MongoDBAdapter } from './adapters/mongodb';

// Supported database types
type DBType = 'memory' | 'mongodb';

function getAdapter(): DatabaseAdapter {
	const dbType = env.DB_TYPE as DBType | undefined;

	// Require explicit database selection
	if (!dbType) {
		throw new Error(
			'DB_TYPE environment variable is required.\n' +
			'Options:\n' +
			'  DB_TYPE=memory    - In-memory (dev only, data lost on restart)\n' +
			'  DB_TYPE=mongodb   - MongoDB (requires MONGODB_URI)\n'
		);
	}

	switch (dbType) {
		case 'memory':
			console.log('Using Memory adapter (data will be lost on restart)');
			return new MemoryAdapter();

		case 'mongodb':
			if (!env.MONGODB_URI) {
				throw new Error('MONGODB_URI is required when DB_TYPE=mongodb');
			}
			console.log('Using MongoDB adapter');
			return new MongoDBAdapter();

		default:
			throw new Error(`Unknown DB_TYPE: ${dbType}. Use 'memory' or 'mongodb'`);
	}
}

export const db: DatabaseAdapter = getAdapter();

// Re-export types
export type { DatabaseAdapter, Paste, CreatePasteInput, Result } from './types';
