/**
 * GET /api/paste/[id] - Retrieve an encrypted paste by ID
 *
 * Response:
 * Success: {
 *   content: string,
 *   createdAt: string,
 *   expiresAt: string,
 *   hasPassword: boolean,
 *   salt?: string,
 *   burnAfterRead: boolean
 * }
 * Error: { error: string }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;

		// Validate ID
		if (!id || typeof id !== 'string' || id.trim().length === 0) {
			return json(
				{ error: 'Invalid paste ID' },
				{ status: 400 }
			);
		}

		// Fetch paste from database
		const result = await db.getPaste(id);

		if (!result.success) {
			return json(
				{ error: result.error },
				{ status: 500 }
			);
		}

		const paste = result.data;

		// Check if paste exists
		if (!paste) {
			return json(
				{ error: 'Paste not found' },
				{ status: 404 }
			);
		}

		// Check if paste has expired
		if (new Date() > paste.expiresAt) {
			return json(
				{ error: 'Paste has expired' },
				{ status: 404 }
			);
		}

		// Prepare response data
		// NOTE: Do NOT delete burn-after-read pastes here!
		// The client shows a warning first, then calls DELETE explicitly after user confirms.
		const responseData = {
			content: paste.content,
			createdAt: paste.createdAt.toISOString(),
			expiresAt: paste.expiresAt.toISOString(),
			hasPassword: paste.hasPassword,
			salt: paste.salt ?? undefined,
			burnAfterRead: paste.burnAfterRead,
			language: paste.language || 'plaintext'
		};

		// Return paste data
		return json(responseData);

	} catch (error) {
		console.error('Error retrieving paste:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;

		if (!id || typeof id !== 'string' || id.trim().length === 0) {
			return json(
				{ error: 'Invalid paste ID' },
				{ status: 400 }
			);
		}

		const result = await db.deletePaste(id);

		if (!result.success) {
			return json(
				{ error: result.error },
				{ status: 500 }
			);
		}

		return json({ success: true });

	} catch (error) {
		console.error('Error deleting paste:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};
