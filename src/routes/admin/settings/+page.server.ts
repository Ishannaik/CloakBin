import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { env } from '$env/dynamic/private';
import { db } from '$lib/db';
import { createRequiresLogin } from '$lib/server/accounts/env';
import { resolveMaxPasteBytes } from '$lib/server/maxPasteBytes';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.isAdmin) throw redirect(302, '/admin/login');
	// Check database connection
	let dbConnected = false;
	try {
		const result = await db.healthCheck();
		dbConnected = result.success;
	} catch {
		dbConnected = false;
	}

	// WHY read-only: every setting here comes from environment variables, which are
	// the single source of truth. A form that saved to the database could disagree with them.
	return {
		settings: {
			createRequiresLogin: createRequiresLogin(),
			maxPasteBytes: resolveMaxPasteBytes(env.MAX_PASTE_BYTES)
		},
		dbConnected,
		storageInfo: env.DB_TYPE === 'mongodb' ? 'MongoDB' : 'Memory (data is lost on restart)'
	};
};

export const actions: Actions = {
	clearExpired: async ({ locals }) => {
		if (!locals.isAdmin) throw redirect(302, '/admin/login');
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
