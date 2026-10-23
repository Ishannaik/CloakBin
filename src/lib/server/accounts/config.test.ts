import { describe, expect, it } from 'vitest';
import { canCreatePaste, parseCreateRequiresLogin } from './config';

describe('parseCreateRequiresLogin', () => {
	it('is off when unset or empty, so existing installs do not change', () => {
		expect(parseCreateRequiresLogin(undefined)).toBe(false);
		expect(parseCreateRequiresLogin('')).toBe(false);
		expect(parseCreateRequiresLogin('false')).toBe(false);
		expect(parseCreateRequiresLogin('0')).toBe(false);
	});

	it('accepts true in any case', () => {
		expect(parseCreateRequiresLogin('true')).toBe(true);
		expect(parseCreateRequiresLogin(' TRUE ')).toBe(true);
		expect(parseCreateRequiresLogin('1')).toBe(true);
	});

	it('throws on a typo instead of silently leaving creation open', () => {
		expect(() => parseCreateRequiresLogin('ture')).toThrow(/CREATE_REQUIRES_LOGIN/);
		expect(() => parseCreateRequiresLogin('yes')).toThrow();
	});
});

describe('canCreatePaste', () => {
	const anon = { user: null, isAdmin: false };
	it('lets anyone create when the flag is off', () => {
		expect(canCreatePaste(false, anon)).toBe(true);
	});
	it('blocks anonymous callers when the flag is on', () => {
		expect(canCreatePaste(true, anon)).toBe(false);
	});
	it('allows members and the admin when the flag is on', () => {
		expect(canCreatePaste(true, { user: { id: 'u1' }, isAdmin: false })).toBe(true);
		expect(canCreatePaste(true, { user: null, isAdmin: true })).toBe(true);
	});
});
