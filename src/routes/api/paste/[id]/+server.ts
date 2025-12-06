/**
 * GET /api/paste/[id] - Retrieve an encrypted paste by ID
 *
 * Response:
 * Success: {
 *   content: string,
 *   createdAt: string,
 *   expiresAt: string
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

		// Return paste data
		return json({
			content: paste.content,
			createdAt: paste.createdAt.toISOString(),
			expiresAt: paste.expiresAt.toISOString()
		});

	} catch (error) {
		console.error('Error retrieving paste:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};
