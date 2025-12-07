<script lang="ts">
	import type { ComponentType } from 'svelte';

	interface Props {
		title: string;
		value: string | number;
		subtitle?: string;
		icon?: ComponentType;
		trend?: {
			value: number;
			isPositive: boolean;
		};
	}

	let { title, value, subtitle, icon: Icon, trend }: Props = $props();
</script>

<div
	class="rounded-lg border border-zinc-800 bg-[#242830] p-5 transition-all hover:border-zinc-700"
>
	<div class="flex items-start justify-between">
		<div class="space-y-1">
			<p class="text-sm text-zinc-400">{title}</p>
			<p class="text-2xl font-semibold text-zinc-100">{value}</p>
			{#if subtitle}
				<p class="text-xs text-zinc-500">{subtitle}</p>
			{/if}
		</div>

		{#if Icon}
			<div class="rounded-lg bg-zinc-800/50 p-2.5">
				<Icon class="h-5 w-5 text-teal-400" />
			</div>
		{/if}
	</div>

	{#if trend}
		<div class="mt-3 flex items-center gap-1.5">
			<span
				class="text-xs font-medium {trend.isPositive ? 'text-emerald-400' : 'text-red-400'}"
			>
				{trend.isPositive ? '+' : ''}{trend.value}%
			</span>
			<span class="text-xs text-zinc-500">vs last week</span>
		</div>
	{/if}
</div>
