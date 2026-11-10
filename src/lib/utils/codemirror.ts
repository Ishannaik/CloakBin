import type { LanguageSupport } from '@codemirror/language';
import { isAllowedPasteLanguage } from '$lib/languages';

/**
 * Dynamically load the CodeMirror language extension for a paste language id.
 *
 * Returns `null` (no syntax highlighting) for `auto`, `plaintext`, languages
 * outside the paste allowlist, languages without a CodeMirror package, and
 * when the dynamic import fails.
 */
export async function loadLanguageExtension(lang: string): Promise<LanguageSupport | null> {
	if (!isAllowedPasteLanguage(lang)) {
		return null;
	}
	try {
		switch (lang) {
			case 'javascript':
			case 'js':
				return (await import('@codemirror/lang-javascript')).javascript();
			case 'typescript':
			case 'ts':
				return (await import('@codemirror/lang-javascript')).javascript({ typescript: true });
			case 'python':
			case 'py':
				return (await import('@codemirror/lang-python')).python();
			case 'json':
				return (await import('@codemirror/lang-json')).json();
			case 'html':
			case 'xml':
				return (await import('@codemirror/lang-html')).html();
			case 'css':
				return (await import('@codemirror/lang-css')).css();
			case 'markdown':
			case 'md':
				return (await import('@codemirror/lang-markdown')).markdown();
			case 'sql':
				return (await import('@codemirror/lang-sql')).sql();
			case 'java':
				return (await import('@codemirror/lang-java')).java();
			case 'cpp':
			case 'c':
				return (await import('@codemirror/lang-cpp')).cpp();
			case 'rust':
			case 'rs':
				return (await import('@codemirror/lang-rust')).rust();
			case 'go':
				return (await import('@codemirror/lang-go')).go();
			case 'php':
				return (await import('@codemirror/lang-php')).php();
			case 'yaml':
			case 'yml':
				return (await import('@codemirror/lang-yaml')).yaml();
			default:
				return null;
		}
	} catch {
		return null;
	}
}
