<script lang="ts">
	import { onMount } from 'svelte';

	let content = $state('');
	let expiry = $state('1h');
	let isCreating = $state(false);
	let editorHeight = $state(0);
	let editorEl: HTMLDivElement;
	let textareaEl: HTMLTextAreaElement;
	let lineNumbersEl: HTMLDivElement;

	const expiryOptions = [
		{ value: '1h', label: '1 Hour' },
		{ value: '24h', label: '24 Hours' },
		{ value: '7d', label: '7 Days' }
	];

	// Line height is 24px (leading-6)
	const LINE_HEIGHT = 24;

	// Calculate visible lines based on editor height, or content lines if more
	let visibleLines = $derived(Math.floor(editorHeight / LINE_HEIGHT) || 1);
	let contentLines = $derived(content.split('\n').length);
	let lineCount = $derived(Math.max(contentLines, visibleLines));

	onMount(() => {
		if (editorEl) {
			editorHeight = editorEl.clientHeight;
		}
	});

	// Sync scroll between textarea and line numbers
	function handleScroll() {
		if (lineNumbersEl && textareaEl) {
			lineNumbersEl.scrollTop = textareaEl.scrollTop;
		}
	}

	async function createPaste() {
		if (!content.trim()) return;
		isCreating = true;
		// TODO: Implement encryption + API call
		console.log('Creating paste...', { content, expiry });
	}
</script>

<svelte:window on:resize={() => { if (editorEl) editorHeight = editorEl.clientHeight; }} />

<div class="h-screen flex flex-col relative overflow-hidden">
	<!-- Header -->
	<header class="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
		<div class="flex items-center gap-3">
			<img src="/logo.png" alt="CloakBin" class="w-8 h-8" />
			<span class="text-xl font-semibold text-teal-400">CloakBin</span>
		</div>
		<div class="flex items-center gap-2">
			<button class="px-4 py-2 bg-teal-500 text-zinc-900 rounded font-medium hover:bg-teal-400 transition-colors flex items-center gap-2">
				<span>+</span> New
			</button>
			<button class="px-4 py-2 border border-zinc-700 rounded hover:border-zinc-500 transition-colors flex items-center gap-2">
				<span>⧉</span> Duplicate
			</button>
			<button class="px-4 py-2 border border-zinc-700 rounded hover:border-zinc-500 transition-colors flex items-center gap-2">
				<span>↗</span> Share
			</button>
		</div>
	</header>

	<!-- Editor -->
	<div class="flex-1 flex overflow-hidden" bind:this={editorEl}>
		<!-- Line numbers -->
		<div
			bind:this={lineNumbersEl}
			class="w-14 bg-[#1e2228] text-zinc-600 text-right pr-4 py-4 select-none text-sm leading-6 font-mono overflow-hidden"
		>
			{#each Array(lineCount) as _, i}
				<div>{i + 1}</div>
			{/each}
		</div>
		<!-- Textarea -->
		<textarea
			bind:this={textareaEl}
			bind:value={content}
			onscroll={handleScroll}
			placeholder="// Paste something private..."
			class="flex-1 bg-transparent resize-none py-4 px-2 text-sm leading-6 focus:outline-none placeholder:text-zinc-600 font-mono overflow-y-auto"
			spellcheck="false"
		></textarea>
	</div>

	<!-- Bottom bar -->
	<div class="flex items-center justify-center gap-4 py-4 border-t border-zinc-800">
		<div class="flex items-center gap-2">
			<span class="text-zinc-500 text-sm">Expiry:</span>
			<select
				bind:value={expiry}
				class="bg-[#242830] border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
			>
				{#each expiryOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
		<button
			onclick={createPaste}
			disabled={!content.trim() || isCreating}
			class="px-6 py-2 bg-teal-500 text-zinc-900 rounded font-medium hover:bg-teal-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{isCreating ? 'Creating...' : 'Create'}
		</button>
	</div>

	<!-- Footer badge -->
	<div class="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-zinc-500">
		<span>🔒</span>
		<span>End-to-end encrypted</span>
	</div>
</div>
