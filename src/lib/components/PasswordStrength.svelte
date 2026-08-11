<script lang="ts">
	let { score = 0 }: { score?: number } = $props();

	const label = $derived(score >= 3 ? 'Strong' : score >= 2 ? 'Fair' : 'Weak');
	const fill = $derived(score >= 3 ? 'bg-teal-500' : score >= 2 ? 'bg-amber-400' : 'bg-red-400');
</script>

<div class="mt-1 flex items-center gap-2" aria-label="Password strength: {label}">
	<div class="flex gap-1" aria-hidden="true">
		{#each [1, 2, 3] as level}
			<span class="h-1.5 w-8 rounded-full {level <= score ? fill : 'bg-zinc-700'}"></span>
		{/each}
	</div>
	<span class="text-xs text-zinc-400">{label}</span>
</div>
