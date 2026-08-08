export const RATE_LIMITS = {
	createPaste: { requests: 10, windowMs: 60 * 1000 }, // 10 pastes per minute
	readPaste: { requests: 60, windowMs: 60 * 1000 }, // 60 reads per minute
	default: { requests: 100, windowMs: 60 * 1000 } // 100 requests per minute
} as const;

export function resolveRateLimitType(method: string, path: string): keyof typeof RATE_LIMITS {
	if (method === 'POST' && path === '/api/paste') return 'createPaste';
	if (path.startsWith('/api/paste/') && (method === 'GET' || (method === 'POST' && path.endsWith('/burn')))) {
		return 'readPaste';
	}
	return 'default';
}
