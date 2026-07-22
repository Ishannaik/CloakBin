/**
 * Shared paste language allowlist.
 *
 * Kept in one place so POST /api/paste, CodeMirror loaders, and the
 * language picker stay aligned. Unknown values fall back to plaintext.
 */

/** Canonical language ids accepted for storage / highlighting. */
export const PASTE_LANGUAGES = [
	'plaintext',
	'javascript',
	'typescript',
	'python',
	'json',
	'html',
	'xml',
	'css',
	'markdown',
	'sql',
	'java',
	'cpp',
	'c',
	'rust',
	'go',
	'php',
	'yaml',
	'ruby',
	'csharp',
	'kotlin',
	'swift',
	'scala',
	'bash',
	'shell',
	// Extra ids produced by CLI EXT_MAP / future highlighters — still safe to store
	'tsx',
	'jsx',
	'toml',
	'scss',
	'lua',
	'perl',
	'r',
	'dart',
	'haskell',
	'elixir',
	'erlang',
	'clojure',
	'vue',
	'svelte',
	'ini',
	'powershell',
	'batch',
	'diff',
	'latex',
	'zig',
	'nim',
	'protobuf',
	'graphql',
	'hcl',
	'dockerfile',
	'makefile'
] as const;

export type PasteLanguage = (typeof PASTE_LANGUAGES)[number];

export const PASTE_LANGUAGE_SET: ReadonlySet<string> = new Set(PASTE_LANGUAGES);

/** Short / alternate ids → canonical paste language id. */
export const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
	js: 'javascript',
	ts: 'typescript',
	py: 'python',
	md: 'markdown',
	yml: 'yaml',
	rs: 'rust',
	htm: 'html',
	sh: 'bash',
	zsh: 'bash'
};

/** Options shown in the create-page language picker (UI only). */
export const LANGUAGE_PICKER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
	{ value: 'auto', label: 'Auto-detect' },
	{ value: 'javascript', label: 'JavaScript' },
	{ value: 'typescript', label: 'TypeScript' },
	{ value: 'python', label: 'Python' },
	{ value: 'rust', label: 'Rust' },
	{ value: 'go', label: 'Go' },
	{ value: 'java', label: 'Java' },
	{ value: 'cpp', label: 'C/C++' },
	{ value: 'csharp', label: 'C#' },
	{ value: 'php', label: 'PHP' },
	{ value: 'ruby', label: 'Ruby' },
	{ value: 'swift', label: 'Swift' },
	{ value: 'kotlin', label: 'Kotlin' },
	{ value: 'sql', label: 'SQL' },
	{ value: 'html', label: 'HTML' },
	{ value: 'css', label: 'CSS' },
	{ value: 'json', label: 'JSON' },
	{ value: 'yaml', label: 'YAML' },
	{ value: 'markdown', label: 'Markdown' },
	{ value: 'bash', label: 'Bash/Shell' },
	{ value: 'plaintext', label: 'Plain Text' }
];

/**
 * Normalize a client-supplied language string for storage.
 * Unknown / non-string values become `plaintext` (never stored raw).
 */
export function normalizePasteLanguage(language: unknown): string {
	if (typeof language !== 'string') return 'plaintext';
	const raw = language.trim().toLowerCase();
	if (!raw || raw === 'auto') return 'plaintext';

	const canonical = LANGUAGE_ALIASES[raw] ?? raw;
	return PASTE_LANGUAGE_SET.has(canonical) ? canonical : 'plaintext';
}

export function isAllowedPasteLanguage(language: string): boolean {
	const raw = language.trim().toLowerCase();
	const canonical = LANGUAGE_ALIASES[raw] ?? raw;
	return PASTE_LANGUAGE_SET.has(canonical);
}
