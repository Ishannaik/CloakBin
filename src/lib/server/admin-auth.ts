/**
 * Admin session authentication — HMAC-signed cookie tokens.
 *
 * Extracted from admin/login/+page.server.ts (signing) and hooks.server.ts
 * (verification) so the security-critical logic is testable. Behaviour is
 * intentionally identical to the original inline code.
 *
 * Token format: base64("<timestamp>:<username>:<hmac_hex>")
 * where hmac = HMAC-SHA256(secret, "<timestamp>:<username>"), secret = ADMIN_PASS.
 */
import { createHmac, createHash, timingSafeEqual } from 'crypto';

/** 24 hours — the admin session lifetime. */
export const ADMIN_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Constant-time string comparison. Both sides are hashed to fixed 32-byte
 * buffers so timingSafeEqual gets equal-length inputs (no length leak) and the
 * comparison runs in constant time regardless of where the strings differ.
 */
export function safeEqual(a: string, b: string): boolean {
	const ha = createHash('sha256').update(a).digest();
	const hb = createHash('sha256').update(b).digest();
	return timingSafeEqual(ha, hb);
}

/** Build a signed admin session token. `now` is injectable for testing. */
export function signAdminSession(username: string, secret: string, now: number = Date.now()): string {
	const payload = now + ':' + username;
	const signature = createHmac('sha256', secret).update(payload).digest('hex');
	return Buffer.from(payload + ':' + signature).toString('base64');
}

/**
 * Verify an admin session token. Returns true only when the token is a
 * well-formed, non-expired token for `expectedUser` whose HMAC signature
 * matches (constant-time). Any malformed/forged/tampered/expired token → false.
 * `now` is injectable for testing.
 */
export function verifyAdminSession(
	token: string,
	expectedUser: string,
	secret: string,
	maxAgeMs: number = ADMIN_SESSION_MAX_AGE_MS,
	now: number = Date.now()
): boolean {
	try {
		const decoded = Buffer.from(token, 'base64').toString('utf-8');
		const parts = decoded.split(':');
		// Token format: timestamp:username:hmac_hex
		if (parts.length !== 3) return false;
		const [timestamp, username, providedSig] = parts;

		const sessionAge = now - parseInt(timestamp, 10);
		if (!(username === expectedUser && sessionAge >= 0 && sessionAge < maxAgeMs)) {
			return false;
		}

		// Recompute HMAC and compare in constant time.
		const expectedSig = createHmac('sha256', secret)
			.update(timestamp + ':' + username)
			.digest('hex');
		const sigBuffer = Buffer.from(providedSig, 'utf-8');
		const expectedBuffer = Buffer.from(expectedSig, 'utf-8');
		return sigBuffer.length === expectedBuffer.length && timingSafeEqual(sigBuffer, expectedBuffer);
	} catch {
		// Invalid base64 / parse error → not authenticated.
		return false;
	}
}
