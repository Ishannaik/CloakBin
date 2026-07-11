<script lang="ts">
	import { Clock, Infinity as InfinityIcon } from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	let {
		value = $bindable('1h'),
		options
	}: {
		value?: string;
		options: { value: string; label: string }[];
	} = $props();

	let open = $state(false);
	let root: HTMLDivElement | undefined = $state();

	const selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? value);

	function select(v: string) {
		value = v;
		open = false;
	}

	function onWindowClick(e: MouseEvent) {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKey} />

<div class="relative shrink-0" bind:this={root}>
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label="Paste expiry"
		class="flex items-center gap-1.5 h-8 min-w-[7rem] px-2.5 bg-bg-secondary border border-zinc-700 rounded text-zinc-200 text-sm transition-colors hover:border-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
	>
		{#if value === 'never'}
			<InfinityIcon class="size-3.5 text-amber-400" />
		{:else}
			<Clock class="size-3.5 text-zinc-400" />
		{/if}
		<span class="flex-1 text-left">{selectedLabel}</span>
		<svg
			class="size-3.5 text-zinc-500 transition-transform duration-150 {open ? 'rotate-180' : ''}"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg
		>
	</button>

	{#if open}
		<div
			transition:slide={{ duration: 150 }}
			role="listbox"
			tabindex="-1"
			class="absolute bottom-full mb-1.5 left-0 w-max min-w-full bg-zinc-800 border border-zinc-700 rounded shadow-xl overflow-hidden z-50 py-1"
		>
			{#each options as option}
				<button
					type="button"
					role="option"
					aria-selected={option.value === value}
					onclick={() => select(option.value)}
					class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors hover:bg-zinc-700 {option.value ===
					value
						? 'text-teal-400'
						: 'text-zinc-300'}"
				>
					{#if option.value === 'never'}
						<InfinityIcon class="size-3.5 text-amber-400" />
					{:else}
						<Clock class="size-3.5 text-zinc-500" />
					{/if}
					<span class="flex-1">{option.label}</span>
					{#if option.value === value}
						<span class="text-teal-400">✓</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
