import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	DEFAULT_FONT_SIZE,
	FONT_SIZE_STORAGE_KEY,
	MAX_FONT_SIZE,
	MIN_FONT_SIZE,
	clampFontSize,
	loadFontSize,
	saveFontSize
} from './fontSize';

function stubLocalStorage(initial: Record<string, string> = {}) {
	const store = new Map(Object.entries(initial));
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => void store.set(key, value)
	});
	return store;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('clampFontSize', () => {
	it('raises a size below MIN_FONT_SIZE to the minimum', () => {
		expect(clampFontSize(MIN_FONT_SIZE - 5)).toBe(MIN_FONT_SIZE);
	});

	it('lowers a size above MAX_FONT_SIZE to the maximum', () => {
		expect(clampFontSize(MAX_FONT_SIZE + 5)).toBe(MAX_FONT_SIZE);
	});

	it('keeps an in-range size and rounds it to a whole number', () => {
		expect(clampFontSize(16)).toBe(16);
		expect(clampFontSize(16.4)).toBe(16);
	});
});

describe('loadFontSize', () => {
	it('returns the default when localStorage is missing', () => {
		vi.stubGlobal('localStorage', undefined);

		expect(loadFontSize()).toBe(DEFAULT_FONT_SIZE);
	});

	it('returns the default when the stored value is not a number', () => {
		stubLocalStorage({ [FONT_SIZE_STORAGE_KEY]: 'nope' });

		expect(loadFontSize()).toBe(DEFAULT_FONT_SIZE);
	});

	it('clamps an out-of-range stored value', () => {
		stubLocalStorage({ [FONT_SIZE_STORAGE_KEY]: '99' });

		expect(loadFontSize()).toBe(MAX_FONT_SIZE);
	});
});

describe('saveFontSize', () => {
	it('writes the clamped number', () => {
		const store = stubLocalStorage();

		saveFontSize(MAX_FONT_SIZE + 10);

		expect(store.get(FONT_SIZE_STORAGE_KEY)).toBe(String(MAX_FONT_SIZE));
	});

	it('does not throw when localStorage is missing', () => {
		vi.stubGlobal('localStorage', undefined);

		expect(() => saveFontSize(16)).not.toThrow();
	});
});
