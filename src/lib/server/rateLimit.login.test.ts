import { describe, expect, it } from 'vitest';
import { resolveRateLimitType } from './rateLimit';

describe('login rate limit', () => {
	it('covers every sign-in form', () => {
		expect(resolveRateLimitType('POST', '/login')).toBe('login');
		expect(resolveRateLimitType('POST', '/admin/login')).toBe('login');
		expect(resolveRateLimitType('POST', '/join/abc')).toBe('login');
		expect(resolveRateLimitType('GET', '/login')).toBe('default');
	});
});
