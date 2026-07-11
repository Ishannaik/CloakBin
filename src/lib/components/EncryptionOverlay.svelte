<script lang="ts">
	import { Lock } from 'lucide-svelte';
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';
	import { startCipherMorph } from '$lib/utils/cipher-morph';

	interface Props {
		active: boolean;
		sourceText: string;
		encryptedText: string;
		onFrame?: (text: string) => void;
	}

	let { active, sourceText, encryptedText, onFrame }: Props = $props();

	let showOverlay = $state(false);

	// Morph animation — drives the editor's value via onFrame callback
	$effect(() => {
		if (!browser || !active) return;

		showOverlay = true;

		// Snapshot source text WITHOUT tracking — content gets cleared
		// after the API call and we don't want that to restart the animation
		const source = untrack(() => sourceText);

		// Track encryptedText — starts empty, effect re-runs when ciphertext arrives
		if (!encryptedText) return;

		return startCipherMorph(source, encryptedText, (text) => {
			onFrame?.(text);
		});
	});

	// Keep overlay in DOM during fade-out transition
	$effect(() => {
		if (!active && showOverlay) {
			const id = setTimeout(() => (showOverlay = false), 200);
			return () => clearTimeout(id);
		}
	});
</script>

{#if showOverlay}
	<div
		class="absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-200 pointer-events-none"
		class:opacity-100={active}
		class:opacity-0={!active}
		role="status"
		aria-live="polite"
		aria-label="Encrypting your content"
	>
		<div
			class="relative flex items-center gap-2 px-4 py-2 bg-zinc-900/80 rounded-lg border border-teal-500/30 backdrop-blur-sm"
		>
			<Lock size={16} class="text-teal-400" />
			<span class="text-teal-400 text-sm font-medium">Encrypting...</span>
		</div>
	</div>
{/if}
