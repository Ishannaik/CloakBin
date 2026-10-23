/**
 * Account store export. Follows DB_TYPE like the paste adapter in $lib/db.
 */
import { env } from '$env/dynamic/private';
import type { AccountStore } from './types';
import { MemoryAccountStore } from './memory';
import { MongoAccountStore } from './mongodb';

function getStore(): AccountStore {
	switch (env.DB_TYPE) {
		case 'memory':
			return new MemoryAccountStore();
		case 'mongodb':
			return new MongoAccountStore();
		default:
			// $lib/db already throws a full explanation for a missing or unknown DB_TYPE.
			throw new Error(`Unknown DB_TYPE: ${env.DB_TYPE}. Use 'memory' or 'mongodb'`);
	}
}

export const accounts: AccountStore = getStore();
export type { AccountStore, User, Session, Invite } from './types';
