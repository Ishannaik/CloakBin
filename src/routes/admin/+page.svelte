<script lang="ts">
	import StatsCard from '$lib/components/admin/StatsCard.svelte';
	import {
		FileText,
		Users,
		HardDrive,
		Eye,
		Lock,
		Flame,
		Clock,
		TrendingUp,
		Calendar
	} from 'lucide-svelte';

	type TimeRange = '1h' | '24h' | '7d' | '30d' | '1y' | 'all' | 'custom';
	let selectedRange = $state<TimeRange>('24h');
	let showCustomPicker = $state(false);
	let customStartDate = $state('');
	let customEndDate = $state('');

	const timeRanges: { value: TimeRange; label: string }[] = [
		{ value: '1h', label: '1H' },
		{ value: '24h', label: '24H' },
		{ value: '7d', label: '7D' },
		{ value: '30d', label: '30D' },
		{ value: '1y', label: '1Y' },
		{ value: 'all', label: 'All' },
		{ value: 'custom', label: 'Custom' },
	];

	function selectRange(range: TimeRange) {
		selectedRange = range;
		showCustomPicker = range === 'custom';
	}

	// Mock data that would change based on selectedRange
	const statsData: Record<TimeRange, { totalPastes: number; pastesToday: number; activeUsers: number; storageUsed: string; passwordProtected: number; burnAfterRead: number; avgExpiry: string; viewsToday: number; trend: number }> = {
		'1h': { totalPastes: 12847, pastesToday: 18, activeUsers: 156, storageUsed: '2.4 GB', passwordProtected: 34, burnAfterRead: 12, avgExpiry: '24h', viewsToday: 423, trend: 5 },
		'24h': { totalPastes: 12847, pastesToday: 234, activeUsers: 1892, storageUsed: '2.4 GB', passwordProtected: 34, burnAfterRead: 12, avgExpiry: '24h', viewsToday: 5621, trend: 12 },
		'7d': { totalPastes: 12847, pastesToday: 1468, activeUsers: 1892, storageUsed: '2.4 GB', passwordProtected: 34, burnAfterRead: 12, avgExpiry: '24h', viewsToday: 34880, trend: 8 },
		'30d': { totalPastes: 12847, pastesToday: 5890, activeUsers: 1892, storageUsed: '2.4 GB', passwordProtected: 34, burnAfterRead: 12, avgExpiry: '24h', viewsToday: 67234, trend: 15 },
		'1y': { totalPastes: 12847, pastesToday: 12847, activeUsers: 1892, storageUsed: '2.4 GB', passwordProtected: 34, burnAfterRead: 12, avgExpiry: '24h', viewsToday: 89432, trend: 45 },
		'all': { totalPastes: 12847, pastesToday: 12847, activeUsers: 1892, storageUsed: '2.4 GB', passwordProtected: 34, burnAfterRead: 12, avgExpiry: '24h', viewsToday: 89432, trend: 0 },
		'custom': { totalPastes: 12847, pastesToday: 3200, activeUsers: 1892, storageUsed: '2.4 GB', passwordProtected: 34, burnAfterRead: 12, avgExpiry: '24h', viewsToday: 42000, trend: 15 },
	};

	const stats = $derived(statsData[selectedRange]);

	const periodLabel = $derived({
		'1h': 'Last hour',
		'24h': 'Today',
		'7d': 'Last 7 days',
		'30d': 'Last 30 days',
		'1y': 'Last year',
		'all': 'All time',
		'custom': customStartDate && customEndDate ? `${customStartDate} - ${customEndDate}` : 'Custom range',
	}[selectedRange]);
</script>

<svelte:head>
	<title>Dashboard | CloakBin Admin</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-zinc-100">Dashboard</h1>
			<p class="mt-1 text-sm text-zinc-400">Overview of your CloakBin instance</p>
		</div>
		<div class="flex items-center gap-2">
			<Calendar class="h-4 w-4 text-zinc-500" />
			<div class="flex flex-wrap rounded-lg border border-zinc-700 bg-zinc-800 p-1">
				{#each timeRanges as range}
					<button
						onclick={() => selectRange(range.value)}
						class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors {selectedRange === range.value ? 'bg-teal-500 text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'}"
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

	<!-- Primary Stats -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<StatsCard
			title="Total Pastes"
			value={stats.totalPastes.toLocaleString()}
			subtitle="All time"
			icon={FileText}
			trend={{ value: stats.trend, isPositive: stats.trend >= 0 }}
		/>
		<StatsCard
			title="Pastes"
			value={stats.pastesToday.toLocaleString()}
			subtitle={periodLabel}
			icon={TrendingUp}
			trend={{ value: stats.trend, isPositive: stats.trend >= 0 }}
		/>
		<StatsCard
			title="Active Users"
			value={stats.activeUsers.toLocaleString()}
			subtitle={periodLabel}
			icon={Users}
		/>
		<StatsCard
			title="Storage Used"
			value={stats.storageUsed}
			subtitle="of 10 GB limit"
			icon={HardDrive}
		/>
	</div>

	<!-- Secondary Stats -->
	<div>
		<h2 class="mb-4 text-lg font-medium text-zinc-200">Feature Usage</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<StatsCard
				title="Password Protected"
				value="{stats.passwordProtected}%"
				subtitle="of all pastes"
				icon={Lock}
			/>
			<StatsCard
				title="Burn After Read"
				value="{stats.burnAfterRead}%"
				subtitle="of all pastes"
				icon={Flame}
			/>
			<StatsCard
				title="Avg. Expiry"
				value={stats.avgExpiry}
				subtitle="most common"
				icon={Clock}
			/>
			<StatsCard
				title="Views"
				value={stats.viewsToday.toLocaleString()}
				subtitle={periodLabel}
				icon={Eye}
			/>
		</div>
	</div>

	<!-- Recent Activity -->
	<div>
		<h2 class="mb-4 text-lg font-medium text-zinc-200">Recent Activity</h2>
		<div class="rounded-lg border border-zinc-800 bg-[#242830]">
			<div class="divide-y divide-zinc-800">
				{#each Array(5) as _, i}
					<div class="flex items-center justify-between px-5 py-4">
						<div class="flex items-center gap-4">
							<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
								<FileText class="h-4 w-4 text-zinc-400" />
							</div>
							<div>
								<p class="text-sm text-zinc-200">
									Paste <a href="/admin/pastes/aB3x{i}Kp" class="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-teal-400 hover:bg-zinc-700 hover:text-teal-300 transition-colors"
										>aB3x{i}Kp</a
									> created
								</p>
								<p class="text-xs text-zinc-500">{5 - i} minutes ago</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if i % 3 === 0}
								<span
									class="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400"
								>
									<Lock class="h-3 w-3" />
									Password
								</span>
							{/if}
							{#if i % 4 === 0}
								<span
									class="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400"
								>
									<Flame class="h-3 w-3" />
									Burn
								</span>
							{/if}
							<span class="text-xs text-zinc-500">24h expiry</span>
						</div>
					</div>
				{/each}
			</div>
			<div class="border-t border-zinc-800 px-5 py-3">
				<a href="/admin/pastes" class="text-sm text-teal-400 hover:text-teal-300">
					View all pastes →
				</a>
			</div>
		</div>
	</div>
</div>
