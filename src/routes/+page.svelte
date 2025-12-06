<script lang="ts">
	import logo from '$lib/assets/logo.png?enhanced';
	import CodeMirror from 'svelte-codemirror-editor';
	import { javascript } from '@codemirror/lang-javascript';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { EditorView } from '@codemirror/view';
	import {
		dracula,
		cobalt,
		coolGlow,
		amy,
		bespin,
		espresso,
		noctisLilac
	} from 'thememirror';
	import { spring } from 'svelte/motion';
	import { Lock } from 'lucide-svelte';

	// Large paste threshold - show loading indicator for pastes over 1M chars
	const LARGE_PASTE_THRESHOLD = 1_000_000;

	let content = $state('');
	let expiry = $state('1h');
	let selectedTheme = $state('oneDark');
	let isCreating = $state(false);

	// Large paste loading state
	let isLoadingPaste = $state(false);

	// New button animation state
	let newButtonScale = spring(1, { stiffness: 0.3, damping: 0.6 });
	let newButtonRotation = spring(0, { stiffness: 0.2, damping: 0.5 });
	let newButtonSuccess = $state(false);


	function handleNewClick() {
		// Spring bounce effect
		newButtonScale.set(0.9);
		setTimeout(() => newButtonScale.set(1.05), 100);
		setTimeout(() => newButtonScale.set(1), 200);

		// Rotate the plus icon
		newButtonRotation.update((r) => r + 180);

		// Clear the editor
		content = '';

		// Success flash
		newButtonSuccess = true;
		setTimeout(() => {
			newButtonSuccess = false;
		}, 600);
	}


	const themes = {
		oneDark: { name: 'One Dark', theme: oneDark },
		dracula: { name: 'Dracula', theme: dracula },
		cobalt: { name: 'Cobalt', theme: cobalt },
		coolGlow: { name: 'Cool Glow', theme: coolGlow },
		amy: { name: 'Amy', theme: amy },
		bespin: { name: 'Bespin', theme: bespin },
		espresso: { name: 'Espresso', theme: espresso },
		noctisLilac: { name: 'Noctis Lilac', theme: noctisLilac }
	};

	const currentTheme = $derived(themes[selectedTheme as keyof typeof themes].theme);

	const expiryOptions = [
		{ value: '1h', label: '1 Hour' },
		{ value: '24h', label: '24 Hours' },
		{ value: '7d', label: '7 Days' }
	];

	// CodeMirror extension for handling large pastes
	// Shows a brief loading indicator, then lets CodeMirror handle it (it's optimized)
	const largePasteHandler = EditorView.domEventHandlers({
		paste(event, view) {
			const text = event.clipboardData?.getData('text/plain');
			if (!text || text.length < LARGE_PASTE_THRESHOLD) {
				return false; // Let CodeMirror handle normally
			}

			event.preventDefault();

			// Show loading spinner
			isLoadingPaste = true;

			// Use requestAnimationFrame to let the UI update, then insert all at once
			requestAnimationFrame(() => {
				const from = view.state.selection.main.from;
				view.dispatch({
					changes: { from, insert: text },
					selection: { anchor: from + text.length }
				});

				isLoadingPaste = false;
			});

			return true;
		}
	});

	async function createPaste() {
		if (!content.trim()) return;
		isCreating = true;
		// TODO: Implement encryption + API call
		console.log('Creating paste...', { content, expiry });
	}
</script>

<div class="h-screen flex flex-col relative overflow-hidden">
	<!-- Header -->
	<header class="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
		<div class="flex items-center gap-3 group cursor-pointer">
			<enhanced:img
				src={logo}
				alt="CloakBin"
				class="w-8 h-8 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3"
			/>
			<span class="text-xl font-semibold text-teal-400 transition-colors duration-200 group-hover:text-teal-300">CloakBin</span>
		</div>
		<!-- Primary: New -->
		<button
			onclick={handleNewClick}
			class="px-4 py-2 rounded font-medium transition-all duration-150 flex items-center gap-2 {newButtonSuccess ? 'bg-green-500 hover:bg-green-400' : 'bg-teal-500 hover:bg-teal-400'} text-zinc-900 active:scale-95"
			style="transform: scale({$newButtonScale})"
		>
			<span
				class="inline-block"
				style="transform: rotate({$newButtonRotation}deg)"
			>+</span>
			{newButtonSuccess ? 'Cleared!' : 'New'}
		</button>
	</header>

	<!-- Editor -->
	<div class="flex-1 min-h-0 overflow-auto">
		<CodeMirror
			bind:value={content}
			lang={javascript()}
			theme={currentTheme}
			extensions={[EditorView.lineWrapping, largePasteHandler]}
			styles={{
				'&': {
					height: '100%',
					fontSize: '14px'
				},
				'.cm-scroller': {
					overflow: 'auto'
				}
			}}
			placeholder="// Paste something private..."
		/>
	</div>

	<!-- Bottom bar -->
	<div class="flex items-center justify-center gap-4 py-4 border-t border-zinc-800">
		<div class="flex items-center gap-2">
			<span class="text-zinc-500 text-sm">Theme:</span>
			<select
				bind:value={selectedTheme}
				class="bg-[#242830] border border-zinc-700 rounded px-3 py-2 text-sm cursor-pointer transition-all duration-150 hover:border-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
			>
				{#each Object.entries(themes) as [key, { name }]}
					<option value={key}>{name}</option>
				{/each}
			</select>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-zinc-500 text-sm">Expiry:</span>
			<select
				bind:value={expiry}
				class="bg-[#242830] border border-zinc-700 rounded px-3 py-2 text-sm cursor-pointer transition-all duration-150 hover:border-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
			>
				{#each expiryOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
		<!-- Primary: Create -->
		<button
			onclick={createPaste}
			disabled={!content.trim() || isCreating}
			class="px-6 py-2 bg-teal-500 text-zinc-900 rounded font-medium transition-all duration-150 hover:bg-teal-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
		>
			{#if isCreating}
				<span class="flex items-center gap-1">
					Creating
					<span class="flex gap-0.5">
						<span class="w-1 h-1 bg-zinc-900 rounded-full animate-bounce-dot" style="animation-delay: 0ms"></span>
						<span class="w-1 h-1 bg-zinc-900 rounded-full animate-bounce-dot" style="animation-delay: 150ms"></span>
						<span class="w-1 h-1 bg-zinc-900 rounded-full animate-bounce-dot" style="animation-delay: 300ms"></span>
					</span>
				</span>
			{:else}
				Create
			{/if}
		</button>
	</div>

	<!-- Footer badge -->
	<div class="absolute bottom-4 right-4 flex items-center gap-1.5 text-xs text-zinc-500 group cursor-default select-none transition-colors duration-200 hover:text-zinc-400">
		<Lock size={14} class="text-teal-500" />
		<span>End-to-end encrypted</span>
	</div>

	<!-- Large paste loading overlay -->
	{#if isLoadingPaste}
		<div class="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
			<div class="bg-zinc-800 rounded-lg p-6 shadow-2xl flex flex-col items-center gap-3 animate-scale-in">
				<div class="w-8 h-8 border-3 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"></div>
				<p class="text-zinc-300 text-sm">Loading paste...</p>
			</div>
		</div>
	{/if}
</div>
