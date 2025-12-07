/**
 * SvelteKit Server Hooks
 * Middleware that runs on EVERY request
 */

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
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
