import { afterEach, describe, expect, it, vi } from 'vitest';
import { startCipherMorph } from './cipher-morph';

afterEach(() => {
	vi.unstubAllGlobals();
});

function stubReducedMotion(reduced: boolean) {
	vi.stubGlobal('window', {
		matchMedia: () => ({ matches: reduced }),
	});
}

function stubRaf() {
	const ids = new Set<number>();
	let cancelled = false;
	let pending: FrameRequestCallback | null = null;

	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		pending = callback;
		const id = ids.size + 1;
		ids.add(id);
		return id;
	});
	vi.stubGlobal('cancelAnimationFrame', (id: number) => {
		if (ids.has(id)) cancelled = true;
	});

	return {
		runNow(now: number) {
			const callback = pending;
			pending = null;
			callback?.(now);
		},
		get cancelled() {
			return cancelled;
		},
	};
}

describe('startCipherMorph', () => {
	it('calls onFrame once with the target when reduced motion is on', () => {
		stubReducedMotion(true);
		const onFrame = vi.fn();

		startCipherMorph('abc', 'xyz', onFrame);

		expect(onFrame).toHaveBeenCalledTimes(1);
		expect(onFrame).toHaveBeenCalledWith('xyz');
	});

	it('handles empty source and target without scheduling frames', () => {
		stubReducedMotion(true);
		const onFrame = vi.fn();

		startCipherMorph('', '', onFrame);

		expect(onFrame).toHaveBeenCalledTimes(1);
		expect(onFrame).toHaveBeenCalledWith('');
	});

	it('cleanup cancels the scheduled frame', () => {
		stubReducedMotion(false);
		const raf = stubRaf();
		const onFrame = vi.fn();

		const cleanup = startCipherMorph('abc', 'xyz', onFrame);
		cleanup();

		expect(raf.cancelled).toBe(true);
	});

	it('pads a shorter source and completes to the target', () => {
		stubReducedMotion(false);
		const raf = stubRaf();
		const onFrame = vi.fn();

		startCipherMorph('a', 'xyz', onFrame);
		raf.runNow(performance.now() + 3000);

		expect(onFrame).toHaveBeenLastCalledWith('xyz');
	});
});
