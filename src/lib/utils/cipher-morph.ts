const CIPHER = '╬░▒▓█▐▌◆◇○●□■∀∂∃∅∇∈∋∏∑∞∧∨⊕⊗';
const SCRAMBLE_MS = 2000;
const FLICKER_FRAMES = 6;

/** Fisher-Yates shuffle (in-place) */
function shuffle<T>(arr: T[]): T[] {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

/**
 * Morph text character-by-character from source → target.
 * Calls `onFrame` each animation frame with the intermediate string.
 * Returns a cleanup function to cancel the animation.
 */
export function startCipherMorph(
	source: string,
	target: string,
	onFrame: (text: string) => void
): () => void {
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const original = source.split('');
	const encrypted = target.split('');

	if (original.length === 0 && encrypted.length === 0) {
		onFrame(target);
		return () => {};
	}

	const len = Math.max(original.length, encrypted.length);
	while (original.length < len) original.push(' ');
	while (encrypted.length < len) encrypted.push(' ');

	if (reducedMotion) {
		onFrame(target);
		return () => {};
	}

	const indices = shuffle(Array.from({ length: len }, (_, i) => i));
	const transitionRank = new Array(len);
	indices.forEach((pos, rank) => {
		transitionRank[pos] = rank;
	});

	onFrame(original.join(''));

	const t0 = performance.now();
	let rafId: number;

	function tick(now: number) {
		const progress = Math.min((now - t0) / SCRAMBLE_MS, 1);
		const transitionedCount = Math.floor(progress * len);

		const next: string[] = new Array(len);

		for (let i = 0; i < len; i++) {
			const rank = transitionRank[i];

			if (rank < transitionedCount - FLICKER_FRAMES) {
				next[i] = encrypted[i];
			} else if (rank < transitionedCount) {
				next[i] = CIPHER[Math.floor(Math.random() * CIPHER.length)];
			} else {
				next[i] = original[i];
			}
		}

		onFrame(next.join(''));

		if (progress >= 1) {
			onFrame(target);
			return;
		}

		rafId = requestAnimationFrame(tick);
	}

	rafId = requestAnimationFrame(tick);
	return () => cancelAnimationFrame(rafId);
}
