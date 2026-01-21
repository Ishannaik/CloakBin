/**
 * Serialize structured data for safe embedding inside a `<script type="application/ld+json">` tag.
 *
 * WHY: A bare `JSON.stringify(data)` can produce HTML that breaks the surrounding `<script>` tag.
 * If any string contains `</script>`, the browser HTML parser closes the tag early.
 * Escaping <, >, &, U+2028, U+2029 keeps JSON valid while making it safe to inline in HTML.
 */
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const UNSAFE = new RegExp('[<>&' + LS + PS + ']', 'g');

const ESCAPES: Record<string, string> = {
	'<': '\\u003c',
	'>': '\\u003e',
	'&': '\\u0026',
	[LS]: '\\u2028',
	[PS]: '\\u2029'
};

export function jsonLd(data: unknown): string {
	return JSON.stringify(data).replace(UNSAFE, (c) => ESCAPES[c]);
}
