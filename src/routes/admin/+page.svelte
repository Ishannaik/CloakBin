<script lang="ts">
	import StatsCard from '$lib/components/admin/StatsCard.svelte';
	import {
		FileText,
		HardDrive,
		Lock,
		Flame,
		TrendingUp
	} from 'lucide-svelte';

	let { data } = $props();

	// Format bytes to human readable
	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	// Calculate percentages
	const passwordPercent = $derived(
		data.stats.total > 0 ? Math.round((data.stats.withPassword / data.stats.total) * 100) : 0
	);
	const burnPercent = $derived(
		data.stats.total > 0 ? Math.round((data.stats.burnAfterRead / data.stats.total) * 100) : 0
	);

	// Format relative time
	function timeAgo(date: Date): string {
		const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
		if (seconds < 60) return 'just now';
		if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
		if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
		return Math.floor(seconds / 86400) + 'd ago';
	}
</script>

<svelte:head>
	<title>Dashboard | CloakBin Admin</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-semibold text-zinc-100">Dashboard</h1>
		<p class="mt-1 text-sm text-zinc-400">Overview of your CloakBin instance</p>
	</div>

	<!-- Primary Stats -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<StatsCard
			title="Total Pastes"
			value={data.stats.total.toLocaleString()}
			subtitle="All time"
			icon={FileText}
		/>
		<StatsCard
			title="Created Today"
			value={data.stats.today.toLocaleString()}
			subtitle="Last 24 hours"
			icon={TrendingUp}
		/>
		<StatsCard
			title="Total Storage"
			value={formatBytes(data.stats.totalSizeBytes)}
			subtitle="Avg: {formatBytes(data.stats.avgSizeBytes)}/paste"
			icon={HardDrive}
		/>
		<StatsCard
			title="Password Protected"
			value="{passwordPercent}%"
			subtitle="{data.stats.withPassword.toLocaleString()} pastes"
			icon={Lock}
		/>
	</div>

	<!-- Secondary Stats -->
	<div>
		<h2 class="mb-4 text-lg font-medium text-zinc-200">Feature Usage</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<StatsCard
				title="Burn After Read"
				value="{burnPercent}%"
				subtitle="{data.stats.burnAfterRead.toLocaleString()} pastes"
				icon={Flame}
			/>
		</div>
	</div>

	<!-- Recent Activity -->
	<div>
		<h2 class="mb-4 text-lg font-medium text-zinc-200">Recent Pastes</h2>
		<div class="rounded-lg border border-zinc-800 bg-bg-secondary">
			{#if data.recentPastes.length === 0}
				<div class="px-5 py-8 text-center text-zinc-500">
					No pastes yet
				</div>
			{:else}
				<div class="divide-y divide-zinc-800">
					{#each data.recentPastes as paste}
						<div class="flex items-center justify-between px-5 py-4">
							<div class="flex items-center gap-4">
								<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
									<FileText class="h-4 w-4 text-zinc-400" />
								</div>
								<div>
									<p class="text-sm text-zinc-200">
										Paste <a href="/admin/pastes/{paste.id}" class="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-teal-400 hover:bg-zinc-700 hover:text-teal-300 transition-colors"
											>{paste.id}</a
										>
									</p>
									<p class="text-xs text-zinc-500">{timeAgo(paste.createdAt)}</p>
								</div>
							</div>
							<div class="flex items-center gap-2">
								{#if paste.hasPassword}
									<span
										class="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400"
									>
										<Lock class="h-3 w-3" />
										Password
									</span>
								{/if}
								{#if paste.burnAfterRead}
									<span
										class="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400"
									>
										<Flame class="h-3 w-3" />
										Burn
									</span>
								{/if}
								<span class="text-xs text-zinc-500">{formatBytes(paste.sizeBytes)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
			<div class="border-t border-zinc-800 px-5 py-3">
				<a href="/admin/pastes" class="text-sm text-teal-400 hover:text-teal-300">
					View all pastes →
				</a>
			</div>
		</div>
	</div>
</div>
