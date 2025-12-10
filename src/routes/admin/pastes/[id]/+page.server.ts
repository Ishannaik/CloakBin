import { db } from '$lib/db';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const result = await db.getPaste(params.id);

	if (!result.success) {
		throw error(500, result.error);
	}

	if (!result.data) {
		throw error(404, 'Paste not found');
	}

	const paste = result.data;

	// Calculate encrypted content size
	const contentSize = paste.content ? new TextEncoder().encode(paste.content).length : 0;

	return {
		paste: {
			id: paste.id,
			createdAt: paste.createdAt.toISOString(),
			expiresAt: paste.expiresAt.toISOString(),
			encryptedSize: contentSize,
			hasPassword: paste.hasPassword,
			burnAfterRead: paste.burnAfterRead,
			// Note: We don't track these in the current schema, so set defaults
			// viewCount: 0, // Not tracked (zero-knowledge)
			// lastViewedAt: null, // Not tracked
			// detectedLanguage: null, // Content is encrypted
			// dmcaFlag: false, // Not implemented yet
		}
	};
};

export const actions: Actions = {
	delete: async ({ params }) => {
		const result = await db.deletePaste(params.id);

		if (!result.success) {
			return fail(500, { error: result.error });
		}

		throw redirect(303, '/admin/pastes?deleted=' + params.id);
	}
};
