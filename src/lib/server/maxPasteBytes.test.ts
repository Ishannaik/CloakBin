import { describe, it, expect } from 'vitest';
import {
	resolveMaxPasteBytes,
	utf8ByteLength,
	DEFAULT_MAX_PASTE_BYTES
} from './maxPasteBytes';

describe('resolveMaxPasteBytes', () => {
	it('defaults to 10 MiB when unset or empty', () => {
		expect(resolveMaxPasteBytes(undefined)).toBe(DEFAULT_MAX_PASTE_BYTES);
		expect(resolveMaxPasteBytes('')).toBe(DEFAULT_MAX_PASTE_BYTES);
		expect(DEFAULT_MAX_PASTE_BYTES).toBe(10 * 1024 * 1024);
	});

	it('parses a positive integer env value', () => {
		expect(resolveMaxPasteBytes('1048576')).toBe(1_048_576);
		expect(resolveMaxPasteBytes('100')).toBe(100);
	});

	it('falls back on invalid or non-positive values', () => {
		expect(resolveMaxPasteBytes('nope')).toBe(DEFAULT_MAX_PASTE_BYTES);
		expect(resolveMaxPasteBytes('0')).toBe(DEFAULT_MAX_PASTE_BYTES);
		expect(resolveMaxPasteBytes('-5')).toBe(DEFAULT_MAX_PASTE_BYTES);
		expect(resolveMaxPasteBytes('1.5')).toBe(1); // parseInt truncates
	});
});

describe('utf8ByteLength', () => {
	it('counts ASCII one byte per char', () => {
		expect(utf8ByteLength('abc')).toBe(3);
	});

	it('counts multi-byte UTF-8 correctly', () => {
		expect(utf8ByteLength('é')).toBe(2);
		expect(utf8ByteLength('🙂')).toBe(4);
	});
});
