/**
 * Validate the optional `burnAfterRead` flag on paste creation.
 *
 * Only an actual boolean should turn burn-after-read on. Anything else
 * (a stringified "false", a number, an object, ...) is a client bug and
 * must be rejected with a 400 rather than being coerced to a truthy
 * value, which would silently burn a paste the user meant to keep.
 *
 * Omitting the field entirely is valid and defaults to `false`.
 */
export type BurnAfterReadValidation =
	| { valid: true; value: boolean }
	| { valid: false };

export function validateBurnAfterRead(value: unknown): BurnAfterReadValidation {
	if (value === undefined) {
		return { valid: true, value: false };
	}

	if (typeof value === 'boolean') {
		return { valid: true, value };
	}

	return { valid: false };
}
