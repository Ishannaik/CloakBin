import { describe, it, expect } from 'vitest';
import { safeEqual, signAdminSession, verifyAdminSession } from './admin-auth';

const SECRET = 'super-secret-admin-pass';
const USER = 'admin';
const DAY = 24 * 60 * 60 * 1000;
const T = 1_700_000_000_000; // fixed reference time for deterministic tests

describe('safeEqual (constant-time compare)', () => {
	it('is true for equal strings', () => {
		expect(safeEqual('correct-horse', 'correct-horse')).toBe(true);
	});
	it('is false for different strings of equal length', () => {
		expect(safeEqual('abcdef', 'abcxef')).toBe(false);
	});
	it('is false for different lengths (no length leak / no throw)', () => {
		expect(safeEqual('abc', 'abcdef')).toBe(false);
	});
	it('is true for two empty strings', () => {
		expect(safeEqual('', '')).toBe(true);
	});
});

describe('admin session sign/verify', () => {
	it('round-trips a freshly signed token', () => {
		const token = signAdminSession(USER, SECRET, T);
		expect(verifyAdminSession(token, USER, SECRET, DAY, T + 1000)).toBe(true);
	});

	it('rejects a forged token with a bogus signature (the lissy93 attack)', () => {
		// btoa("admin:<now>") style forgery — attacker knows the username but not the HMAC.
		const forged = Buffer.from(T + ':' + USER + ':' + 'deadbeefdeadbeef').toString('base64');
		expect(verifyAdminSession(forged, USER, SECRET, DAY, T + 1000)).toBe(false);
	});

	it('rejects a token with no signature part at all (only 2 fields)', () => {
		const forged = Buffer.from(T + ':' + USER).toString('base64');
		expect(verifyAdminSession(forged, USER, SECRET, DAY, T + 1000)).toBe(false);
	});

	it('rejects a tampered signature (flipped char, same length)', () => {
		const token = signAdminSession(USER, SECRET, T);
		const [ts, user, sig] = Buffer.from(token, 'base64').toString('utf-8').split(':');
		const flipped = sig.slice(0, -1) + (sig.slice(-1) === 'a' ? 'b' : 'a');
		const tampered = Buffer.from(ts + ':' + user + ':' + flipped).toString('base64');
		expect(verifyAdminSession(tampered, USER, SECRET, DAY, T + 1000)).toBe(false);
	});

	it('rejects verification under the wrong secret', () => {
		const token = signAdminSession(USER, SECRET, T);
		expect(verifyAdminSession(token, USER, 'different-secret', DAY, T + 1000)).toBe(false);
	});

	it('rejects an expired token', () => {
		const token = signAdminSession(USER, SECRET, T);
		// age = 5000ms, maxAge = 1000ms
		expect(verifyAdminSession(token, USER, SECRET, 1000, T + 5000)).toBe(false);
	});

	it('rejects a future-dated token (negative age)', () => {
		const token = signAdminSession(USER, SECRET, T + 10_000);
		expect(verifyAdminSession(token, USER, SECRET, DAY, T)).toBe(false);
	});

	it('rejects the wrong username', () => {
		const token = signAdminSession(USER, SECRET, T);
		expect(verifyAdminSession(token, 'attacker', SECRET, DAY, T + 1000)).toBe(false);
	});

	it('rejects garbage / empty input without throwing', () => {
		expect(verifyAdminSession('', USER, SECRET, DAY, T)).toBe(false);
		expect(verifyAdminSession('%%%not-base64%%%', USER, SECRET, DAY, T)).toBe(false);
	});
});
