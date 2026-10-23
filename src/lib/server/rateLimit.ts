export const RATE_LIMITS = {
	createPaste: { requests: 10, windowMs: 60 * 1000 }, // 10 pastes per minute
	readPaste: { requests: 60, windowMs: 60 * 1000 }, // 60 reads per minute
	// Sign-in forms (member login, invite sign-up, admin login): slows password guessing.
	login: { requests: 10, windowMs: 15 * 60 * 1000 },
	default: { requests: 100, windowMs: 60 * 1000 } // 100 requests per minute
} as const;

export function resolveRateLimitType(method: string, path: string): keyof typeof RATE_LIMITS {
	if (method === 'POST' && path === '/api/paste') return 'createPaste';
	if (method === 'POST' && (path === '/login' || path === '/admin/login' || path.startsWith('/join/'))) {
		return 'login';
	}
	if (path.startsWith('/api/paste/') && (method === 'GET' || (method === 'POST' && path.endsWith('/burn')))) {
		return 'readPaste';
	}
	return 'default';
}
