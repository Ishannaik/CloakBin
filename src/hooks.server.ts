/**
 * SvelteKit Server Hooks
 * Middleware that runs on EVERY request
 */

import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// ============================================
// RATE LIMITING (In-Memory)
// ============================================
/**
 * Simple in-memory rate limiter using sliding window algorithm.
 *
 * LIMITATIONS:
 * - Resets on server restart/redeploy (spammer gets fresh quota)
 * - Doesn't share state across multiple server instances
 * - Memory grows with unique IPs (cleaned up periodically)
 *
 * WHEN THIS IS FINE:
 * - Single server deployment (Vercel free tier, single VPS)
 * - Low-medium traffic sites
 * - 99% of self-hosted deployments
 *
 * WHEN TO UPGRADE:
 * - High traffic (>10k requests/min)
 * - Multiple server instances
 * - Need persistent rate limiting across deploys
 *
 * TO UPGRADE: Replace this with Redis/Upstash:
 * ```ts
 * import { Ratelimit } from "@upstash/ratelimit";
 * import { Redis } from "@upstash/redis";
 * const ratelimit = new Ratelimit({
 *   redis: Redis.fromEnv(),
 *   limiter: Ratelimit.slidingWindow(10, "1m"),
 * });
 * ```
 */

interface RateLimitEntry {
	count: number;
	resetTime: number;
}

// Store: IP -> { count, resetTime }
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations
const RATE_LIMITS = {
	createPaste: { requests: 10, windowMs: 60 * 1000 }, // 10 pastes per minute
	readPaste: { requests: 60, windowMs: 60 * 1000 }, // 60 reads per minute
	default: { requests: 100, windowMs: 60 * 1000 } // 100 requests per minute
} as const;

// Cleanup old entries every 5 minutes to prevent memory bloat
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
	const now = Date.now();
	if (now - lastCleanup < CLEANUP_INTERVAL) return;

	for (const [ip, entry] of rateLimitStore.entries()) {
		if (now > entry.resetTime) {
			rateLimitStore.delete(ip);
		}
	}
	lastCleanup = now;
}

/**
 * Check if an IP is rate limited for a specific action
 * @returns true if rate limited (should block), false if allowed
 */
function isRateLimited(
	ip: string,
	limit: { requests: number; windowMs: number }
): { limited: boolean; remaining: number; resetIn: number } {
	cleanupExpiredEntries();

	const now = Date.now();
	const key = ip;
	const entry = rateLimitStore.get(key);

	// First request or window expired
	if (!entry || now > entry.resetTime) {
		rateLimitStore.set(key, {
			count: 1,
			resetTime: now + limit.windowMs
		});
		return { limited: false, remaining: limit.requests - 1, resetIn: limit.windowMs };
	}

	// Within window - check count
	if (entry.count >= limit.requests) {
		return { limited: true, remaining: 0, resetIn: entry.resetTime - now };
	}

	// Increment count
	entry.count++;
	return { limited: false, remaining: limit.requests - entry.count, resetIn: entry.resetTime - now };
}

/**
 * Get client IP from request headers
 * Handles proxies (Vercel, Cloudflare, nginx)
 */
function getClientIP(event: Parameters<Handle>[0]['event']): string {
	// Vercel/Cloudflare/proxy headers
	const forwarded = event.request.headers.get('x-forwarded-for');
	if (forwarded) {
		return forwarded.split(',')[0].trim();
	}

	// Cloudflare specific
	const cfIP = event.request.headers.get('cf-connecting-ip');
	if (cfIP) return cfIP;

	// Vercel specific
	const vercelIP = event.request.headers.get('x-real-ip');
	if (vercelIP) return vercelIP;

	// Fallback (won't work behind proxy but good for local dev)
	return '127.0.0.1';
}

export const handle: Handle = async ({ event, resolve }) => {
	// ============================================
	// ADMIN SESSION CHECK
	// ============================================
	const adminSession = event.cookies.get('admin_session');
	if (adminSession) {
		try {
			const decoded = Buffer.from(adminSession, 'base64').toString('utf-8');
			const [username, timestamp] = decoded.split(':');
			const sessionAge = Date.now() - parseInt(timestamp, 10);
			const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
			if (username === env.ADMIN_USER && sessionAge < MAX_AGE) {
				event.locals.isAdmin = true;
			}
		} catch {
			// Invalid session format - ignore
		}
	}

	// ============================================
	// RATE LIMITING
	// ============================================
	const ip = getClientIP(event);
	const path = event.url.pathname;
	const method = event.request.method;

	// Determine which rate limit to apply
	let limit = RATE_LIMITS.default;
	let limitType = 'default';

	if (method === 'POST' && path === '/api/paste') {
		limit = RATE_LIMITS.createPaste;
		limitType = 'createPaste';
	} else if (method === 'GET' && path.startsWith('/api/paste/')) {
		limit = RATE_LIMITS.readPaste;
		limitType = 'readPaste';
	}

	// Check rate limit
	const { limited, remaining, resetIn } = isRateLimited(`${ip}:${limitType}`, limit);

	if (limited) {
		console.warn(`Rate limited: IP=${ip}, type=${limitType}, resetIn=${Math.ceil(resetIn / 1000)}s`);
		return new Response(
			JSON.stringify({
				error: 'Too many requests',
				retryAfter: Math.ceil(resetIn / 1000)
			}),
			{
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					'Retry-After': String(Math.ceil(resetIn / 1000)),
					'X-RateLimit-Remaining': '0',
					'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000))
				}
			}
		);
	}

	// ============================================
	// CSRF PROTECTION
	// ============================================
	// For state-changing requests (POST, PUT, DELETE), verify the request
	// came from our own site by checking the Origin header.
	// This prevents evil.com from tricking users into making requests.

	if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(event.request.method)) {
		const origin = event.request.headers.get('origin');
		const host = event.request.headers.get('host');

		// Origin header is sent by browsers on cross-origin requests
		// If it exists and doesn't match our host, reject the request
		if (origin) {
			try {
				const originHost = new URL(origin).host;
				if (originHost !== host) {
					console.warn(`CSRF blocked: origin=${origin}, host=${host}`);
					return new Response('Forbidden - CSRF protection', { status: 403 });
				}
			} catch {
				// Invalid origin URL
				return new Response('Forbidden - Invalid origin', { status: 403 });
			}
		}

		// Also check Referer as fallback (some browsers don't send Origin)
		// Only check if Origin was missing
		if (!origin) {
			const referer = event.request.headers.get('referer');
			if (referer) {
				try {
					const refererHost = new URL(referer).host;
					if (refererHost !== host) {
						console.warn(`CSRF blocked: referer=${referer}, host=${host}`);
						return new Response('Forbidden - CSRF protection', { status: 403 });
					}
				} catch {
					// Invalid referer URL - allow (some privacy tools strip referer)
				}
			}
			// If neither Origin nor Referer present, allow the request
			// This handles direct API calls, curl, etc.
		}
	}

	// Run the actual route handler
	const response = await resolve(event);

	// ============================================
	// SECURITY HEADERS
	// ============================================

	// 1. X-Frame-Options: Prevent clickjacking
	// Stops your site from being embedded in an iframe on malicious sites
	// DENY = never allow in iframe, SAMEORIGIN = only your own site can iframe it
	response.headers.set('X-Frame-Options', 'DENY');

	// 2. X-Content-Type-Options: Prevent MIME sniffing
	// Stops browsers from guessing file types (e.g., treating .txt as .js)
	// This prevents attacks where malicious content is disguised as safe files
	response.headers.set('X-Content-Type-Options', 'nosniff');

	// 3. Referrer-Policy: Control referrer information
	// When users click links FROM your site, what info gets sent to the destination?
	// strict-origin-when-cross-origin = send full URL for same-site, only origin for cross-site
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	// 4. Permissions-Policy: Disable browser features you don't need
	// Prevents malicious scripts from accessing camera, mic, location, etc.
	// Empty () = disabled completely
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), interest-cohort=()'
	);

	// 5. X-XSS-Protection: Legacy XSS filter (for older browsers)
	// Modern browsers have better protection, but this helps older ones
	// 1; mode=block = enable filter and block the page if attack detected
	response.headers.set('X-XSS-Protection', '1; mode=block');

	// 6. X-DNS-Prefetch-Control: Control DNS prefetching
	// Browsers sometimes pre-resolve DNS for links on the page
	// 'off' = disable this (minor privacy improvement)
	response.headers.set('X-DNS-Prefetch-Control', 'off');

	// 7. Strict-Transport-Security (HSTS): Force HTTPS
	// Tells browsers to ONLY use HTTPS for your site for the next year
	// includeSubDomains = applies to all subdomains too
	// Only set this in production (breaks localhost)
	if (!event.url.hostname.includes('localhost')) {
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=31536000; includeSubDomains'
		);
	}

	// 8. Content-Security-Policy (CSP): Control what resources can load
	// This is the most powerful security header - defines allowed sources
	// - default-src 'self' = only load resources from your own domain
	// - script-src 'self' 'unsafe-inline' = scripts from self + inline scripts (needed for Svelte)
	// - style-src 'self' 'unsafe-inline' = styles from self + inline styles (needed for Tailwind)
	// - img-src 'self' data: blob: = images from self + data URLs + blob URLs
	// - font-src 'self' = fonts from self only
	// - connect-src 'self' = API calls to self only
	response.headers.set(
		'Content-Security-Policy',
		[
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for some Svelte features
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data: blob:",
			"font-src 'self' data:",
			"connect-src 'self'",
			"frame-ancestors 'none'", // Same as X-Frame-Options DENY but CSP version
			"base-uri 'self'",
			"form-action 'self'"
		].join('; ')
	);

	// 9. Cache-Control: Prevent caching of sensitive paste pages
	// Without this, browser caches decrypted content - someone hitting "back" sees it
	// no-store = don't cache at all, must re-fetch
	// private = only browser can cache (not proxies), but we say no-store anyway
	if (event.url.pathname.startsWith('/p/') || event.url.pathname.startsWith('/r/')) {
		response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
	}

	// 10. Cross-Origin-Opener-Policy (COOP): Isolate from cross-origin windows
	// Prevents other sites from opening your site and accessing window properties
	// same-origin = only same-origin windows can reference each other
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

	// 11. Cross-Origin-Resource-Policy (CORP): Control who can load your resources
	// Prevents other sites from embedding your resources (images, scripts, etc.)
	// same-origin = only your site can load your resources
	response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

	return response;
};
