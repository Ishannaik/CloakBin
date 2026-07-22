/**
 * POST /api/paste - Create a new encrypted paste
 *
 * Request body:
 * {
 *   content: string,    // encrypted ciphertext
 *   expiry: "1h" | "24h" | "7d",
 *   salt?: string,      // optional salt for password-protected pastes
 *   burnAfterRead?: boolean  // optional burn after read flag
 * }
 *
 * Response:
 * Success: { id: string }
 * Error: { error: string }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { db } from '$lib/db';
import { resolveMaxPasteBytes, utf8ByteLength } from '$lib/server/maxPasteBytes';

/** Max UTF-8 bytes for paste content; override with MAX_PASTE_BYTES (default 10 MiB). */
const MAX_PASTE_BYTES = resolveMaxPasteBytes(env.MAX_PASTE_BYTES);

const EXPIRY_DURATIONS = {
	'1h': 60 * 60 * 1000,           // 1 hour in ms
	'24h': 24 * 60 * 60 * 1000,     // 24 hours in ms
	'7d': 7 * 24 * 60 * 60 * 1000   // 7 days in ms
} as const;

type ExpiryOption = keyof typeof EXPIRY_DURATIONS;

interface CreatePasteRequest {
	content: string;
	expiry: ExpiryOption;
	salt?: string;
	burnAfterRead?: boolean;
	language?: string;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Parse request body
		let body: CreatePasteRequest;
		try {
			body = await request.json();
		} catch {
			return json(
				{ error: 'Invalid JSON in request body' },
				{ status: 400 }
			);
		}

		const { content, expiry, salt, burnAfterRead, language } = body;

		// Validate content
		if (typeof content !== 'string') {
			return json(
				{ error: 'Content must be a string' },
				{ status: 400 }
			);
		}

		if (content.length === 0) {
			return json(
				{ error: 'Content cannot be empty' },
				{ status: 400 }
			);
		}

		if (utf8ByteLength(content) > MAX_PASTE_BYTES) {
			return json(
				{ error: `Content exceeds maximum size of ${MAX_PASTE_BYTES} bytes` },
				{ status: 413 }
			);
		}

		// Validate expiry
		if (!expiry || !(expiry in EXPIRY_DURATIONS)) {
			return json(
				{ error: 'Expiry must be one of: "1h", "24h", "7d"' },
				{ status: 400 }
			);
		}

		// Calculate expiration date
		const expiresAt = new Date(Date.now() + EXPIRY_DURATIONS[expiry]);

		// Create paste in database
		const result = await db.createPaste({
			content,
			expiresAt,
			hasPassword: !!salt,
			salt: salt,
			burnAfterRead: burnAfterRead ?? false,
			language: language ?? 'plaintext'
		});

		if (!result.success) {
			return json(
				{ error: result.error },
				{ status: 500 }
			);
		}

		// Return paste ID
		return json(
			{ id: result.data.id },
			{ status: 201 }
		);

	} catch (error) {
		console.error('Error creating paste:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};
