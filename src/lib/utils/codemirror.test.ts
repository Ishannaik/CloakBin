import { describe, expect, it } from 'vitest';
import { LanguageSupport } from '@codemirror/language';
import { loadLanguageExtension } from './codemirror';

describe('loadLanguageExtension', () => {
	it.each([
		'javascript', 'js', 'typescript', 'ts', 'python', 'py', 'json', 'html', 'xml',
		'css', 'markdown', 'md', 'sql', 'java', 'cpp', 'c', 'rust', 'rs', 'go', 'php',
		'yaml', 'yml'
	])('loads a language extension for %s', async (lang) => {
		expect(await loadLanguageExtension(lang)).toBeInstanceOf(LanguageSupport);
	});

	it.each(['auto', 'plaintext', 'bash', 'ruby', 'not-a-language', '../evil', ''])(
		'returns null for %s',
		async (lang) => {
			expect(await loadLanguageExtension(lang)).toBeNull();
		}
	);
});
