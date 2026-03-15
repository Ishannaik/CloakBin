/**
 * POST /api/paste/[id]/burn - Atomically read and delete a burn-after-read paste
 *
 * This endpoint ensures burn-after-read pastes can only be viewed once.
 * The paste is deleted from the database in the same operation that returns
 * its content, preventing multiple views.
 *
 * Response:
 * Success: { content, createdAt, expiresAt, hasPassword, salt?, burnAfterRead, language }
 * Not found: { error: "Paste not found" } (404)
 * Error: { error: string } (400/500)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const POST: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;

		// Validate ID
		if (!id || typeof id !== 'string' || id.trim().length === 0) {
			return json(
				{ error: 'Invalid paste ID' },
				{ status: 400 }
			);
		}

		// Atomically find, verify burnAfterRead, delete, and return content
		const result = await db.burnPaste(id);

		if (!result.success) {
			return json(
				{ error: result.error },
				{ status: 500 }
			);
		}

		const paste = result.data;

		if (!paste) {
			return json(
				{ error: 'Paste not found' },
				{ status: 404 }
			);
		}

		// Return paste data (paste is already deleted from the database)
		return json({
			content: paste.content,
			createdAt: paste.createdAt.toISOString(),
			expiresAt: paste.expiresAt.toISOString(),
			hasPassword: paste.hasPassword,
			salt: paste.salt ?? undefined,
			burnAfterRead: paste.burnAfterRead,
			language: paste.language || 'plaintext'
		});

	} catch (error) {
		console.error('Error burning paste:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};
