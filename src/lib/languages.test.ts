import { describe, it, expect } from 'vitest';
import {
	detectLanguageFromFilename,
	normalizePasteLanguage,
	isAllowedPasteLanguage,
	PASTE_LANGUAGE_SET,
	LANGUAGE_PICKER_OPTIONS
} from './languages';

describe('normalizePasteLanguage', () => {
	it('falls back to plaintext for missing / non-string values', () => {
		expect(normalizePasteLanguage(undefined)).toBe('plaintext');
		expect(normalizePasteLanguage(null)).toBe('plaintext');
		expect(normalizePasteLanguage(42)).toBe('plaintext');
		expect(normalizePasteLanguage('')).toBe('plaintext');
		expect(normalizePasteLanguage('   ')).toBe('plaintext');
		expect(normalizePasteLanguage('auto')).toBe('plaintext');
	});

	it('accepts known languages case-insensitively', () => {
		expect(normalizePasteLanguage('javascript')).toBe('javascript');
		expect(normalizePasteLanguage('Python')).toBe('python');
		expect(normalizePasteLanguage('PLAINTEXT')).toBe('plaintext');
	});

	it('maps aliases to canonical ids', () => {
		expect(normalizePasteLanguage('js')).toBe('javascript');
		expect(normalizePasteLanguage('ts')).toBe('typescript');
		expect(normalizePasteLanguage('py')).toBe('python');
		expect(normalizePasteLanguage('yml')).toBe('yaml');
	});

	it('rejects unknown / malicious language strings', () => {
		expect(normalizePasteLanguage('maliciousXYZ')).toBe('plaintext');
		expect(normalizePasteLanguage('<script>alert(1)</script>')).toBe('plaintext');
		expect(normalizePasteLanguage('../../etc/passwd')).toBe('plaintext');
		expect(normalizePasteLanguage('a'.repeat(500))).toBe('plaintext');
	});
});

describe('isAllowedPasteLanguage', () => {
	it('returns true for allowlisted ids and aliases', () => {
		expect(isAllowedPasteLanguage('rust')).toBe(true);
		expect(isAllowedPasteLanguage('rs')).toBe(true);
	});

	it('returns false for unknown ids', () => {
		expect(isAllowedPasteLanguage('maliciousXYZ')).toBe(false);
	});
});

describe('LANGUAGE_PICKER_OPTIONS', () => {
	it('only offers allowlisted values (plus auto)', () => {
		for (const opt of LANGUAGE_PICKER_OPTIONS) {
			if (opt.value === 'auto') continue;
			expect(PASTE_LANGUAGE_SET.has(opt.value)).toBe(true);
		}
	});
});

describe('detectLanguageFromFilename', () => {
	const cases = [
		['main.py', 'python'],
		['script.js', 'javascript'],
		['app.tsx', 'typescript'],
		['style.scss', 'css'],
		['README.md', 'markdown'],
		['Dockerfile', 'dockerfile'],
		['Makefile', 'makefile']
	] as const;

	it.each(cases)('maps %s to %s', (filename, expected) => {
		expect(detectLanguageFromFilename(filename)).toBe(expected);
	});

	it('handles paths and uppercase extensions', () => {
		expect(detectLanguageFromFilename('/tmp/src/Main.PY')).toBe('python');
		expect(detectLanguageFromFilename('C:\\src\\App.TSX')).toBe('typescript');
	});

	it('returns null for unknown or missing extensions', () => {
		expect(detectLanguageFromFilename('notes.txt.bak')).toBeNull();
		expect(detectLanguageFromFilename('README')).toBeNull();
		expect(detectLanguageFromFilename('')).toBeNull();
	});
});
