<script lang="ts">
	import { onMount } from 'svelte';
	import type { Extension } from '@codemirror/state';
	import type { LanguageSupport } from '@codemirror/language';

	// Props matching svelte-codemirror-editor
	let {
		value = $bindable(''),
		lang = null,
		theme = null,
		extensions = [],
		styles = {},
		placeholder = '',
		ariaLabel = 'Code editor'
	}: {
		value?: string;
		lang?: LanguageSupport | null;
		theme?: Extension | null;
		extensions?: Extension[];
		styles?: Record<string, Record<string, string>>;
		placeholder?: string;
		ariaLabel?: string;
	} = $props();

	// PERF: svelte-codemirror-editor + @codemirror/view (~heavy) are loaded dynamically
	// after first paint so the skeleton renders immediately and decrypted content
	// isn't blocked on the editor bundle evaluating.
	let CodeMirrorComponent: typeof import('svelte-codemirror-editor').default | null = $state(null);
	let ariaLabelExtension: Extension | null = $state(null);
	let isLoading = $state(true);

	onMount(async () => {
		// Small delay so first paint happens with the skeleton
		await new Promise((resolve) => requestAnimationFrame(resolve));

		const [module, { EditorView }] = await Promise.all([
			import('svelte-codemirror-editor'),
			import('@codemirror/view')
		]);
		CodeMirrorComponent = module.default;
		ariaLabelExtension = EditorView.contentAttributes.of({ 'aria-label': ariaLabel });
		isLoading = false;
	});
</script>

{#if isLoading || !CodeMirrorComponent}
	<!-- Pulsing skeleton while CodeMirror loads -->
	<div class="absolute inset-0 flex bg-zinc-800 rounded animate-pulse">
		<div class="bg-zinc-900 py-1 px-2 text-right select-none">
			{#each Array(20) as _, i}
				<div class="text-zinc-600 text-sm leading-relaxed">{i + 1}</div>
			{/each}
		</div>
		<div class="flex-1 p-3 flex flex-col gap-2">
			<div class="h-3.5 bg-zinc-700 rounded w-3/4"></div>
			<div class="h-3.5 bg-zinc-700 rounded w-1/2"></div>
			<div class="h-3.5 bg-zinc-700 rounded w-5/6"></div>
			<div class="h-3.5 bg-zinc-700 rounded w-2/3"></div>
			<div class="h-3.5 bg-zinc-700 rounded w-1/4"></div>
			<div class="h-3.5 bg-zinc-700 rounded w-4/5"></div>
			<div class="h-3.5 bg-zinc-700 rounded w-1/3"></div>
			<div class="h-3.5 bg-zinc-700 rounded w-3/5"></div>
			<div class="h-3.5 bg-zinc-700 rounded w-1/2"></div>
			<div class="h-3.5 bg-zinc-700 rounded w-2/3"></div>
			<div class="h-3.5 bg-zinc-700 rounded w-1/4"></div>
			<div class="h-3.5 bg-zinc-700 rounded w-3/4"></div>
		</div>
	</div>
{:else}
	<CodeMirrorComponent
		bind:value
		{lang}
		{theme}
		extensions={[...extensions, ...(ariaLabelExtension ? [ariaLabelExtension] : [])]}
		{styles}
		{placeholder}
	/>
{/if}
