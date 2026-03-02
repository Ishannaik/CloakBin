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
		// NOTE: Burn-after-read pastes are NOT deleted here.
		// The client shows a warning first, then calls POST /api/paste/[id]/burn
		// which atomically deletes and returns the content.
		const responseData = {
			content: paste.content,
			createdAt: paste.createdAt.toISOString(),
			expiresAt: paste.expiresAt.toISOString(),
			hasPassword: paste.hasPassword,
			salt: paste.salt ?? undefined,
			burnAfterRead: paste.burnAfterRead,
			language: paste.language || 'plaintext'
		};

		// PERF/SECURITY: Decide if this response is safe to share via CDN cache.
		// Encrypted pastes are immutable once created, so non-burn pastes can be
		// cached publicly for a short window. Burn-after-read pastes must never
		// be cached because each fetch may trigger destruction.
		const isCacheable = !paste.burnAfterRead;

		const responseHeaders = new Headers({
			'Content-Type': 'application/json'
		});

		if (isCacheable) {
			responseHeaders.set('Cache-Control', 'public, s-maxage=60');
		} else {
			responseHeaders.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
		}

		return new Response(JSON.stringify(responseData), {
			status: 200,
			headers: responseHeaders
		});

	} catch (error) {
		console.error('Error retrieving paste:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

// DELETE handler removed: paste deletion should only happen via:
// - POST /api/paste/[id]/burn (for burn-after-read, atomic delete+return)
// - Automatic TTL expiry (MongoDB TTL index / cleanup cron)
// - Admin panel (admin-authenticated bulk delete)
