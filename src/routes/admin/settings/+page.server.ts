import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async () => {
	// Check database connection
	let dbConnected = false;
	try {
		const result = await db.healthCheck();
		dbConnected = result.success;
	} catch {
		dbConnected = false;
	}

	// Settings are stored in environment variables for now
	// In a full implementation, these would be stored in the database
	return {
		settings: {
			maxPasteSize: 500,
			maxPastesPerHour: 10,
			defaultExpiry: '24h',
			allowAnonymous: true,
			enableBurnAfterRead: true,
			enablePasswordProtection: true,
			inactiveDeleteDays: 90,
		},
		dbConnected,
		storageInfo: 'MongoDB'
	};
};

export const actions: Actions = {
	save: async ({ request }) => {
		// Settings would be saved to database in full implementation
		// For now, just return success (settings are read-only placeholder)
		return { success: true };
	},

	clearExpired: async () => {
		try {
			const result = await db.cleanupExpired();
			if (result.success) {
				return { success: true, deleted: result.data?.deleted ?? 0 };
			}
			return { success: false, error: result.error };
		} catch (e) {
			console.error('Failed to clear expired pastes:', e);
			return { success: false, error: 'Failed to clear expired pastes' };
		}
	}
};
