/**
 * Resolve a paste reference (full URL, id#key, or bare id) to its parts.
 *
 * Web-UI links look like /p/<id>#<key> and read-only links like /r/<id>#<key>;
 * the id is the segment after the route prefix, not the prefix itself.
 */

const ROUTE_PREFIXES = new Set(['p', 'r']);

/** The paste id inside a URL pathname, skipping a known route prefix. */
export function pasteIdFromPath(pathname) {
	const segments = pathname
		.replace(/^\/+|\/+$/g, '')
		.split('/')
		.filter(Boolean);
	if (segments.length === 0) return '';
	if (ROUTE_PREFIXES.has(segments[0]) && segments.length > 1) return segments[1];
	return segments[0];
}

export function parsePasteRef(ref, defaultHost) {
	let id;
	let keyBase64url = null;
	let host = defaultHost;

	if (ref.includes('://') || ref.startsWith('//')) {
		let u;
		try {
			u = new URL(ref);
		} catch {
			throw new Error(`invalid URL: ${ref}`);
		}
		host = `${u.protocol}//${u.host}`;
		id = pasteIdFromPath(u.pathname);
		if (u.hash && u.hash.length > 1) {
			keyBase64url = decodeURIComponent(u.hash.slice(1));
		}
	} else if (ref.includes('#')) {
		// id#key without scheme
		const idx = ref.indexOf('#');
		id = ref.slice(0, idx);
		keyBase64url = decodeURIComponent(ref.slice(idx + 1));
	} else {
		id = ref;
	}

	if (!id) throw new Error('missing paste id');
	return { id, keyBase64url, host };
}
