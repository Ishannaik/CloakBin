<script lang="ts">
	import {
		TrendingUp, TrendingDown, FileText, Users, Eye, HardDrive,
		Clock, Lock, Flame, Calendar
	} from 'lucide-svelte';

	type TimeRange = '1h' | '24h' | '7d' | '30d' | '1y' | 'all' | 'custom';
	let selectedRange = $state<TimeRange>('7d');
	let showCustomPicker = $state(false);
	let customStartDate = $state('');
	let customEndDate = $state('');

	const timeRanges: { value: TimeRange; label: string }[] = [
		{ value: '1h', label: '1 Hour' },
		{ value: '24h', label: '24 Hours' },
		{ value: '7d', label: '7 Days' },
		{ value: '30d', label: '30 Days' },
		{ value: '1y', label: '1 Year' },
		{ value: 'all', label: 'All Time' },
		{ value: 'custom', label: 'Custom' },
	];

	function selectRange(range: TimeRange) {
		selectedRange = range;
		showCustomPicker = range === 'custom';
	}

	// Mock data that would change based on selectedRange
	const baseStats = { pastesTotal: 12847, pastesToday: 234, pastesTrend: 12, viewsTotal: 89432, viewsToday: 5621, viewsTrend: -3, usersTotal: 1892, usersToday: 23, usersTrend: 8, storageUsed: 2.4, storageLimit: 10 };
	const statsData: Record<TimeRange, typeof baseStats> = {
		'1h': { pastesTotal: 12847, pastesToday: 18, pastesTrend: 5, viewsTotal: 89432, viewsToday: 423, viewsTrend: 2, usersTotal: 1892, usersToday: 3, usersTrend: 1, storageUsed: 2.4, storageLimit: 10 },
		'24h': { pastesTotal: 12847, pastesToday: 234, pastesTrend: 12, viewsTotal: 89432, viewsToday: 5621, viewsTrend: -3, usersTotal: 1892, usersToday: 23, usersTrend: 8, storageUsed: 2.4, storageLimit: 10 },
		'7d': { pastesTotal: 12847, pastesToday: 1468, pastesTrend: 12, viewsTotal: 89432, viewsToday: 34880, viewsTrend: -3, usersTotal: 1892, usersToday: 156, usersTrend: 8, storageUsed: 2.4, storageLimit: 10 },
		'30d': { pastesTotal: 12847, pastesToday: 5890, pastesTrend: 8, viewsTotal: 89432, viewsToday: 67234, viewsTrend: 5, usersTotal: 1892, usersToday: 423, usersTrend: 15, storageUsed: 2.4, storageLimit: 10 },
		'1y': { pastesTotal: 12847, pastesToday: 12847, pastesTrend: 45, viewsTotal: 89432, viewsToday: 89432, viewsTrend: 67, usersTotal: 1892, usersToday: 1892, usersTrend: 120, storageUsed: 2.4, storageLimit: 10 },
		'all': { pastesTotal: 12847, pastesToday: 12847, pastesTrend: 0, viewsTotal: 89432, viewsToday: 89432, viewsTrend: 0, usersTotal: 1892, usersToday: 1892, usersTrend: 0, storageUsed: 2.4, storageLimit: 10 },
		'custom': { pastesTotal: 12847, pastesToday: 3200, pastesTrend: 15, viewsTotal: 89432, viewsToday: 42000, viewsTrend: 10, usersTotal: 1892, usersToday: 280, usersTrend: 12, storageUsed: 2.4, storageLimit: 10 },
	};

	const stats = $derived(statsData[selectedRange]);

	const periodLabel = $derived({
		'1h': 'Last hour',
		'24h': 'Last 24h',
		'7d': 'Last 7 days',
		'30d': 'Last 30 days',
		'1y': 'Last year',
		'all': 'All time',
		'custom': customStartDate && customEndDate ? `${customStartDate} - ${customEndDate}` : 'Custom range',
	}[selectedRange]);

	const comparisonLabel = $derived({
		'1h': 'vs previous hour',
		'24h': 'vs yesterday',
		'7d': 'vs last week',
		'30d': 'vs last month',
		'1y': 'vs last year',
		'all': '',
		'custom': 'custom period',
	}[selectedRange]);


	const expiryData = [
		{ label: '1 hour', count: 1234, percentage: 15 },
		{ label: '24 hours', count: 3456, percentage: 35 },
		{ label: '7 days', count: 2890, percentage: 28 },
		{ label: '30 days', count: 1567, percentage: 15 },
		{ label: 'Never', count: 700, percentage: 7 },
	];

	const recentActivity = [
		{ date: 'Today', pastes: 234, views: 5621 },
		{ date: 'Yesterday', pastes: 198, views: 4892 },
		{ date: '2 days ago', pastes: 256, views: 6234 },
		{ date: '3 days ago', pastes: 189, views: 4123 },
		{ date: '4 days ago', pastes: 212, views: 5456 },
		{ date: '5 days ago', pastes: 178, views: 3987 },
		{ date: '6 days ago', pastes: 201, views: 4567 },
	];
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

	<!-- Custom Date Range Picker -->
	{#if showCustomPicker}
		<div class="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3">
			<span class="text-sm text-zinc-400">From:</span>
			<input type="date" bind:value={customStartDate}
				class="rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200 focus:border-teal-500 focus:outline-none" />
			<span class="text-sm text-zinc-400">To:</span>
			<input type="date" bind:value={customEndDate}
				class="rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200 focus:border-teal-500 focus:outline-none" />
			<button class="rounded-lg bg-teal-500 px-4 py-1.5 text-sm font-medium text-zinc-900 hover:bg-teal-400">
				Apply
			</button>
		</div>
	{/if}

	<!-- Key Metrics -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-lg border border-zinc-800 bg-[#242830] p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-zinc-400">Total Pastes</p>
					<p class="mt-1 text-2xl font-semibold text-zinc-100">{stats.pastesTotal.toLocaleString()}</p>
				</div>
				<div class="rounded-lg bg-zinc-800/50 p-2.5">
					<FileText class="h-5 w-5 text-teal-400" />
				</div>
			</div>
			<div class="mt-3 flex items-center gap-1.5">
				{#if stats.pastesTrend >= 0}
					<TrendingUp class="h-4 w-4 text-emerald-400" />
					<span class="text-xs text-emerald-400">+{stats.pastesTrend}%</span>
				{:else}
					<TrendingDown class="h-4 w-4 text-red-400" />
					<span class="text-xs text-red-400">{stats.pastesTrend}%</span>
				{/if}
				<span class="text-xs text-zinc-500">{comparisonLabel}</span>
			</div>
		</div>

		<div class="rounded-lg border border-zinc-800 bg-[#242830] p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-zinc-400">Total Views</p>
					<p class="mt-1 text-2xl font-semibold text-zinc-100">{stats.viewsTotal.toLocaleString()}</p>
				</div>
				<div class="rounded-lg bg-zinc-800/50 p-2.5">
					<Eye class="h-5 w-5 text-teal-400" />
				</div>
			</div>
			<div class="mt-3 flex items-center gap-1.5">
				{#if stats.viewsTrend >= 0}
					<TrendingUp class="h-4 w-4 text-emerald-400" />
					<span class="text-xs text-emerald-400">+{stats.viewsTrend}%</span>
				{:else}
					<TrendingDown class="h-4 w-4 text-red-400" />
					<span class="text-xs text-red-400">{stats.viewsTrend}%</span>
				{/if}
				<span class="text-xs text-zinc-500">{comparisonLabel}</span>
			</div>
		</div>

		<div class="rounded-lg border border-zinc-800 bg-[#242830] p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-zinc-400">Total Users</p>
					<p class="mt-1 text-2xl font-semibold text-zinc-100">{stats.usersTotal.toLocaleString()}</p>
				</div>
				<div class="rounded-lg bg-zinc-800/50 p-2.5">
					<Users class="h-5 w-5 text-teal-400" />
				</div>
			</div>
			<div class="mt-3 flex items-center gap-1.5">
				<TrendingUp class="h-4 w-4 text-emerald-400" />
				<span class="text-xs text-emerald-400">+{stats.usersTrend}%</span>
				<span class="text-xs text-zinc-500">{comparisonLabel}</span>
			</div>
		</div>

		<div class="rounded-lg border border-zinc-800 bg-[#242830] p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-zinc-400">Storage Used</p>
					<p class="mt-1 text-2xl font-semibold text-zinc-100">{stats.storageUsed} GB</p>
				</div>
				<div class="rounded-lg bg-zinc-800/50 p-2.5">
					<HardDrive class="h-5 w-5 text-teal-400" />
				</div>
			</div>
			<div class="mt-3">
				<div class="h-2 overflow-hidden rounded-full bg-zinc-700">
					<div class="h-full bg-teal-500" style="width: {(stats.storageUsed / stats.storageLimit) * 100}%"></div>
				</div>
				<p class="mt-1 text-xs text-zinc-500">{stats.storageUsed} of {stats.storageLimit} GB</p>
			</div>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Expiry Distribution -->
		<div class="rounded-lg border border-zinc-800 bg-[#242830] p-5">
			<h2 class="mb-4 text-lg font-medium text-zinc-200">Expiry Distribution</h2>
			<div class="space-y-3">
				{#each expiryData as item}
					<div>
						<div class="mb-1 flex items-center justify-between text-sm">
							<span class="text-zinc-400">{item.label}</span>
							<span class="text-zinc-200">{item.count.toLocaleString()} ({item.percentage}%)</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-zinc-700">
							<div class="h-full bg-teal-500" style="width: {item.percentage}%"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Feature Usage -->
		<div class="rounded-lg border border-zinc-800 bg-[#242830] p-5">
			<h2 class="mb-4 text-lg font-medium text-zinc-200">Feature Usage</h2>
			<div class="grid grid-cols-2 gap-4">
				<div class="rounded-lg bg-zinc-800/50 p-4">
					<div class="flex items-center gap-2">
						<Lock class="h-5 w-5 text-amber-400" />
						<span class="text-sm text-zinc-400">Password Protected</span>
					</div>
					<p class="mt-2 text-2xl font-semibold text-zinc-100">34%</p>
					<p class="text-xs text-zinc-500">of all pastes</p>
				</div>
				<div class="rounded-lg bg-zinc-800/50 p-4">
					<div class="flex items-center gap-2">
						<Flame class="h-5 w-5 text-red-400" />
						<span class="text-sm text-zinc-400">Burn After Read</span>
					</div>
					<p class="mt-2 text-2xl font-semibold text-zinc-100">12%</p>
					<p class="text-xs text-zinc-500">of all pastes</p>
				</div>
				<div class="rounded-lg bg-zinc-800/50 p-4">
					<div class="flex items-center gap-2">
						<Clock class="h-5 w-5 text-teal-400" />
						<span class="text-sm text-zinc-400">Avg. Expiry</span>
					</div>
					<p class="mt-2 text-2xl font-semibold text-zinc-100">24h</p>
					<p class="text-xs text-zinc-500">most common</p>
				</div>
				<div class="rounded-lg bg-zinc-800/50 p-4">
					<div class="flex items-center gap-2">
						<Eye class="h-5 w-5 text-teal-400" />
						<span class="text-sm text-zinc-400">Avg. Views</span>
					</div>
					<p class="mt-2 text-2xl font-semibold text-zinc-100">7.2</p>
					<p class="text-xs text-zinc-500">per paste</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Recent Activity Table -->
	<div class="rounded-lg border border-zinc-800 bg-[#242830]">
		<div class="border-b border-zinc-800 px-5 py-4">
			<h2 class="text-lg font-medium text-zinc-200">Last 7 Days</h2>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b border-zinc-800 text-left text-xs uppercase text-zinc-500">
						<th class="px-5 py-3">Date</th>
						<th class="px-5 py-3">Pastes Created</th>
						<th class="px-5 py-3">Views</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-800">
					{#each recentActivity as day}
						<tr class="hover:bg-zinc-800/50">
							<td class="px-5 py-3 text-sm text-zinc-200">{day.date}</td>
							<td class="px-5 py-3 text-sm text-zinc-400">{day.pastes}</td>
							<td class="px-5 py-3 text-sm text-zinc-400">{day.views.toLocaleString()}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
