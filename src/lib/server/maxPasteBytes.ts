/**
 * Resolve max paste size from env (DoS control for self-hosters).
 *
 * `MAX_PASTE_BYTES` — maximum UTF-8 byte length of the ciphertext string.
 * Default: 10 MiB. Invalid / non-positive values fall back to the default.
 */
export const DEFAULT_MAX_PASTE_BYTES = 10 * 1024 * 1024; // 10 MiB

export function resolveMaxPasteBytes(
	raw: string | undefined = typeof process !== 'undefined' ? process.env.MAX_PASTE_BYTES : undefined
): number {
	if (raw === undefined || raw === '') return DEFAULT_MAX_PASTE_BYTES;
	const n = Number.parseInt(String(raw), 10);
	return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_PASTE_BYTES;
}

/** UTF-8 byte length of a JS string (paste ciphertext). */
export function utf8ByteLength(value: string): number {
	return new TextEncoder().encode(value).byteLength;
}
