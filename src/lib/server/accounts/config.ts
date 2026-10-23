/**
 * CREATE_REQUIRES_LOGIN parsing. Kept free of $env so it is unit-testable.
 */

/**
 * Unset or empty means off, so existing installs keep open paste creation.
 * Anything other than true/false/1/0 throws: a typo must not silently leave
 * an instance open to anonymous pastes.
 */
export function parseCreateRequiresLogin(raw: string | undefined): boolean {
	const value = (raw ?? '').trim().toLowerCase();
	if (value === '' || value === 'false' || value === '0') return false;
	if (value === 'true' || value === '1') return true;
	throw new Error(`CREATE_REQUIRES_LOGIN must be "true" or "false", got "${raw}"`);
}

/** Who may create a paste: anyone when the flag is off, otherwise members and the admin. */
export function canCreatePaste(
	requiresLogin: boolean,
	locals: { user: { id: string } | null; isAdmin: boolean }
): boolean {
	return !requiresLogin || locals.user !== null || locals.isAdmin;
}
