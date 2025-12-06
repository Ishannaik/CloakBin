/**
 * Database Adapter Export
 * Switch between adapters based on environment
 */

import type { DatabaseAdapter } from './types';
import { MemoryAdapter } from './adapters/memory';
// import { MongoDBAdapter } from './adapters/mongodb';

// For now, use MemoryAdapter for local development
// This will be swapped for MongoDBAdapter in production
export const db: DatabaseAdapter = new MemoryAdapter();

// TODO: Implement getAdapter() function for environment-based switching
// export function getAdapter(): DatabaseAdapter {
//   if (process.env.MONGODB_URI) {
//     return new MongoDBAdapter();
//   }
//   return new MemoryAdapter();
// }

// Re-export types
export type { DatabaseAdapter, Paste, CreatePasteInput, Result } from './types';
