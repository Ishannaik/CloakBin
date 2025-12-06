<script lang="ts">
	import { X } from 'lucide-svelte';

	let { open = $bindable(false), page = 'view' }: { open: boolean; page: 'home' | 'view' } = $props();

	// OS detection for modifier key display
	const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
	const mod = isMac ? '⌘' : 'Ctrl';

	const homeShortcuts = [
		{ keys: `${mod}+S`, description: 'Create paste' },
		{ keys: `${mod}+Shift+N`, description: 'Clear editor' },
		{ keys: `${mod}+A`, description: 'Select all code' },
	];

	const viewShortcuts = [
		{ keys: `${mod}+A`, description: 'Select all code' },
		{ keys: `${mod}+D`, description: 'Duplicate paste' },
		{ keys: `${mod}+S`, description: 'Copy share link' },
		{ keys: `${mod}+Shift+R`, description: 'Open raw view' },
	];

	const globalShortcuts = [
		{ keys: '?', description: 'Show shortcuts' },
		{ keys: `${mod}+/`, description: 'Show shortcuts' },
	];

	const shortcuts = page === 'home' ? homeShortcuts : viewShortcuts;

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			open = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
		onclick={handleBackdropClick}
	>
		<div class="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-md mx-4 animate-scale-in">
			<!-- Header -->
			<div class="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
				<h2 class="text-lg font-semibold text-zinc-100">Keyboard Shortcuts</h2>
				<button
					onclick={() => (open = false)}
					class="p-1 rounded hover:bg-zinc-700 transition-colors"
				>
					<X size={20} class="text-zinc-400" />
				</button>
			</div>

			<!-- Content -->
			<div class="p-5 space-y-5">
				<!-- Page-specific shortcuts -->
				<div>
					<h3 class="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
						{page === 'home' ? 'Editor' : 'Viewing'}
					</h3>
					<div class="space-y-2">
						{#each shortcuts as shortcut}
							<div class="flex items-center justify-between">
								<span class="text-sm text-zinc-300">{shortcut.description}</span>
								<kbd class="px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-xs font-mono text-zinc-300">
									{shortcut.keys}
								</kbd>
							</div>
						{/each}
					</div>
				</div>

				<!-- Global shortcuts -->
				<div>
					<h3 class="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Global</h3>
					<div class="space-y-2">
						{#each globalShortcuts as shortcut}
							<div class="flex items-center justify-between">
								<span class="text-sm text-zinc-300">{shortcut.description}</span>
								<kbd class="px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-xs font-mono text-zinc-300">
									{shortcut.keys}
								</kbd>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Footer hint -->
			<div class="px-5 py-3 border-t border-zinc-700 text-center">
				<span class="text-xs text-zinc-500">Press <kbd class="px-1.5 py-0.5 bg-zinc-800 border border-zinc-600 rounded text-xs">Esc</kbd> to close</span>
			</div>
		</div>
	</div>
{/if}
