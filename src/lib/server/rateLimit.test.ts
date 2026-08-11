import { describe, expect, it } from 'vitest';
import { resolveRateLimitType } from './rateLimit';

describe('resolveRateLimitType', () => {
	it('routes paste creation to its own bucket', () => {
		expect(resolveRateLimitType('POST', '/api/paste')).toBe('createPaste');
	});

	it('routes paste reads to the read bucket', () => {
		expect(resolveRateLimitType('GET', '/api/paste/abc')).toBe('readPaste');
	});

	it('routes burn requests to the read bucket', () => {
		expect(resolveRateLimitType('POST', '/api/paste/abc/burn')).toBe('readPaste');
	});

	it('keeps unrelated POST paths on the default bucket', () => {
		expect(resolveRateLimitType('POST', '/api/paste/abc')).toBe('default');
		expect(resolveRateLimitType('POST', '/api/other')).toBe('default');
	});

	it('keeps non-paste paths on the default bucket', () => {
		expect(resolveRateLimitType('GET', '/api/health')).toBe('default');
	});
});
