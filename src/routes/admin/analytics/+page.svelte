<script lang="ts">
	import {
		FileText, HardDrive,
		Clock, Lock, Flame, Calendar
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	type TimeRange = '1h' | '24h' | '7d' | '30d' | '1y' | 'all';
	let selectedRange = $state<TimeRange>(data.range as TimeRange);

	const timeRanges: { value: TimeRange; label: string }[] = [
		{ value: '1h', label: '1 Hour' },
		{ value: '24h', label: '24 Hours' },
		{ value: '7d', label: '7 Days' },
		{ value: '30d', label: '30 Days' },
		{ value: '1y', label: '1 Year' },
		{ value: 'all', label: 'All Time' },
	];

	function selectRange(range: TimeRange) {
		selectedRange = range;
		goto(`?range=${range}`, { replaceState: true, noScroll: true });
	}

	// Format bytes to human readable
	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	// Calculate percentages for feature usage
	const passwordPercentage = $derived(
		data.stats.pastesTotal > 0
			? Math.round((data.stats.withPassword / data.stats.pastesTotal) * 100)
			: 0
	);
	const burnPercentage = $derived(
		data.stats.pastesTotal > 0
			? Math.round((data.stats.burnAfterRead / data.stats.pastesTotal) * 100)
			: 0
	);
</script>

<svelte:head><title>Analytics | CloakBin Admin</title></svelte:head>

<div class="space-y-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-xl font-semibold text-zinc-100 sm:text-2xl">Analytics</h1>
			<p class="mt-1 text-sm text-zinc-400">Platform metrics and insights</p>
		</div>
		<div class="flex items-center gap-2">
			<Calendar class="h-4 w-4 text-zinc-500" />
			<div class="flex flex-wrap rounded-lg border border-zinc-700 bg-zinc-800 p-1">
				{#each timeRanges as range}
					<button
						onclick={() => selectRange(range.value)}
						class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {selectedRange === range.value ? 'bg-teal-500 text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'}"
					>
						{range.label}
					</button>
				{/each}
			</div>
		</div>
	</div>


	<!-- Key Metrics -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-lg border border-zinc-800 bg-bg-secondary p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-zinc-400">Total Pastes</p>
					<p class="mt-1 text-2xl font-semibold text-zinc-100">{data.stats.pastesTotal.toLocaleString()}</p>
				</div>
				<div class="rounded-lg bg-zinc-800/50 p-2.5">
					<FileText class="h-5 w-5 text-teal-400" />
				</div>
			</div>
			<div class="mt-3 flex items-center gap-1.5">
				<span class="text-xs text-zinc-500">{data.stats.pastesToday} created today</span>
			</div>
		</div>

		<div class="rounded-lg border border-zinc-800 bg-bg-secondary p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-zinc-400">With Password</p>
					<p class="mt-1 text-2xl font-semibold text-zinc-100">{data.stats.withPassword.toLocaleString()}</p>
				</div>
				<div class="rounded-lg bg-zinc-800/50 p-2.5">
					<Lock class="h-5 w-5 text-amber-400" />
				</div>
			</div>
			<div class="mt-3 flex items-center gap-1.5">
				<span class="text-xs text-zinc-500">{passwordPercentage}% of all pastes</span>
			</div>
		</div>

		<div class="rounded-lg border border-zinc-800 bg-bg-secondary p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-zinc-400">Burn After Read</p>
					<p class="mt-1 text-2xl font-semibold text-zinc-100">{data.stats.burnAfterRead.toLocaleString()}</p>
				</div>
				<div class="rounded-lg bg-zinc-800/50 p-2.5">
					<Flame class="h-5 w-5 text-red-400" />
				</div>
			</div>
			<div class="mt-3 flex items-center gap-1.5">
				<span class="text-xs text-zinc-500">{burnPercentage}% of all pastes</span>
			</div>
		</div>

		<div class="rounded-lg border border-zinc-800 bg-bg-secondary p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-zinc-400">Total Storage</p>
					<p class="mt-1 text-2xl font-semibold text-zinc-100">{formatBytes(data.stats.totalSizeBytes)}</p>
				</div>
				<div class="rounded-lg bg-zinc-800/50 p-2.5">
					<HardDrive class="h-5 w-5 text-teal-400" />
				</div>
			</div>
			<div class="mt-3 flex items-center gap-1.5">
				<span class="text-xs text-zinc-500">Avg: {formatBytes(data.stats.avgSizeBytes)} per paste</span>
			</div>
		</div>
	</div>

	<!-- Feature Usage -->
	<div class="rounded-lg border border-zinc-800 bg-bg-secondary p-5">
		<h2 class="mb-4 text-lg font-medium text-zinc-200">Feature Usage</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<div class="rounded-lg bg-zinc-800/50 p-4">
				<div class="flex items-center gap-2">
					<Lock class="h-5 w-5 text-amber-400" />
					<span class="text-sm text-zinc-400">Password Protected</span>
				</div>
				<p class="mt-2 text-2xl font-semibold text-zinc-100">{passwordPercentage}%</p>
				<p class="text-xs text-zinc-500">{data.stats.withPassword.toLocaleString()} pastes</p>
			</div>
			<div class="rounded-lg bg-zinc-800/50 p-4">
				<div class="flex items-center gap-2">
					<Flame class="h-5 w-5 text-red-400" />
					<span class="text-sm text-zinc-400">Burn After Read</span>
				</div>
				<p class="mt-2 text-2xl font-semibold text-zinc-100">{burnPercentage}%</p>
				<p class="text-xs text-zinc-500">{data.stats.burnAfterRead.toLocaleString()} pastes</p>
			</div>
			<div class="rounded-lg bg-zinc-800/50 p-4">
				<div class="flex items-center gap-2">
					<Clock class="h-5 w-5 text-teal-400" />
					<span class="text-sm text-zinc-400">Created Today</span>
				</div>
				<p class="mt-2 text-2xl font-semibold text-zinc-100">{data.stats.pastesToday}</p>
				<p class="text-xs text-zinc-500">new pastes</p>
			</div>
			<div class="rounded-lg bg-zinc-800/50 p-4">
				<div class="flex items-center gap-2">
					<HardDrive class="h-5 w-5 text-teal-400" />
					<span class="text-sm text-zinc-400">Avg. Size</span>
				</div>
				<p class="mt-2 text-2xl font-semibold text-zinc-100">{formatBytes(data.stats.avgSizeBytes)}</p>
				<p class="text-xs text-zinc-500">per paste</p>
			</div>
		</div>
	</div>

	<!-- Recent Activity Table -->
	<div class="rounded-lg border border-zinc-800 bg-bg-secondary">
		<div class="border-b border-zinc-800 px-5 py-4">
			<h2 class="text-lg font-medium text-zinc-200">Daily Activity</h2>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b border-zinc-800 text-left text-xs uppercase text-zinc-500">
						<th class="px-5 py-3">Date</th>
						<th class="px-5 py-3">Pastes Created</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-800">
					{#each data.dailyCounts as day}
						<tr class="hover:bg-zinc-800/50">
							<td class="px-5 py-3 text-sm text-zinc-200">{day.date}</td>
							<td class="px-5 py-3 text-sm text-zinc-400">{day.count}</td>
						</tr>
					{:else}
						<tr>
							<td colspan="2" class="px-5 py-8 text-center text-sm text-zinc-500">No activity data available</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
