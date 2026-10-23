import type { Cookies } from '@sveltejs/kit';
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from './service';

export function setSessionCookie(cookies: Cookies, token: string, url: URL): void {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		// WHY protocol, not NODE_ENV: the Docker image always runs with NODE_ENV=production,
		// and a Secure cookie on a plain-http LAN install would never be sent back.
		// Behind a TLS proxy, ORIGIN=https://... makes url.protocol https.
		secure: url.protocol === 'https:',
		// SECURITY: lax keeps the cookie off cross-site POSTs; hooks also check Origin.
		sameSite: 'lax',
		maxAge: SESSION_MAX_AGE_MS / 1000
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
