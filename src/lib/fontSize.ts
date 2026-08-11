export const DEFAULT_FONT_SIZE = 14;
export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 24;
export const FONT_SIZE_STORAGE_KEY = 'cloakbin_fontsize';

export function clampFontSize(size: number): number {
	return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(size)));
}

export function loadFontSize(): number {
	if (typeof localStorage === 'undefined') return DEFAULT_FONT_SIZE;
	const raw = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
	const value = Number(raw);
	return Number.isFinite(value) ? clampFontSize(value) : DEFAULT_FONT_SIZE;
}

export function saveFontSize(size: number): void {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(clampFontSize(size)));
	}
}
