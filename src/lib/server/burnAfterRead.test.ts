import { describe, it, expect } from 'vitest';
import { validateBurnAfterRead } from './burnAfterRead';

describe('validateBurnAfterRead', () => {
	it('defaults to false when omitted', () => {
		expect(validateBurnAfterRead(undefined)).toEqual({ valid: true, value: false });
	});

	it('accepts an explicit boolean true', () => {
		expect(validateBurnAfterRead(true)).toEqual({ valid: true, value: true });
	});

	it('accepts an explicit boolean false', () => {
		expect(validateBurnAfterRead(false)).toEqual({ valid: true, value: false });
	});

	it('rejects the string "false" instead of coercing it to truthy', () => {
		expect(validateBurnAfterRead('false')).toEqual({ valid: false });
	});

	it('rejects the string "true"', () => {
		expect(validateBurnAfterRead('true')).toEqual({ valid: false });
	});

	it('rejects numeric values like 1', () => {
		expect(validateBurnAfterRead(1)).toEqual({ valid: false });
	});

	it('rejects null', () => {
		expect(validateBurnAfterRead(null)).toEqual({ valid: false });
	});

	it('rejects objects/arrays', () => {
		expect(validateBurnAfterRead({})).toEqual({ valid: false });
		expect(validateBurnAfterRead([])).toEqual({ valid: false });
	});
});
