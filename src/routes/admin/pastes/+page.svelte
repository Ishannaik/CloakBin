<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		FileText, Lock, Flame, Trash2, Eye, MoreVertical,
		Search, CheckSquare, Square, ChevronLeft, ChevronRight, RefreshCw,
		ArrowUp, ArrowUpDown, X, Calendar
	} from 'lucide-svelte';

	let { data } = $props();

	// Local UI state
	let searchQuery = $state($page.url.searchParams.get('q') || '');
	let activeDropdown = $state<string | null>(null);
	let selectedIds = $state<Set<string>>(new Set());
	let deleting = $state(false);
	let refreshing = $state(false);
	let openFilter = $state<string | null>(null);

	// Sorting state from URL
	let sortBy = $derived($page.url.searchParams.get('sort') || 'created');
	let sortOrder = $derived($page.url.searchParams.get('order') || 'desc');

	// Filter state from URL
	const hasPasswordFilter = $derived($page.url.searchParams.get('password') === 'true');
	const burnFilter = $derived($page.url.searchParams.get('burn') === 'true');
	const sizeMin = $derived($page.url.searchParams.get('sizeMin') || '');
	const sizeMax = $derived($page.url.searchParams.get('sizeMax') || '');
	const statusFilter = $derived($page.url.searchParams.get('status') || '');
	const createdAfter = $derived($page.url.searchParams.get('createdAfter') || '');
	const createdBefore = $derived($page.url.searchParams.get('createdBefore') || '');
	const pageSize = $derived(data.pagination.limit || 20);

	const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];

	// Local filter input state (not synced with URL - user types fresh each time)
	let sizeMinInput = $state('');
	let sizeMaxInput = $state('');
	let sizeUnit = $state<'B' | 'KB' | 'MB'>('B');
	let createdAfterInput = $state('');
	let createdBeforeInput = $state('');

	const SIZE_UNITS = { B: 1, KB: 1024, MB: 1024 * 1024 };

	// Format bytes to human readable
	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	// Format relative time
	function timeAgo(date: Date): string {
		const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
		if (seconds < 60) return 'just now';
		if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
		if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
		return Math.floor(seconds / 86400) + 'd ago';
	}

	// Format expiry
	function formatExpiry(expiresAt: Date | null): string {
		if (!expiresAt) return 'Never';
		const diff = new Date(expiresAt).getTime() - Date.now();
		if (diff < 0) return 'Expired';
		if (diff < 3600000) return Math.ceil(diff / 60000) + 'm';
		if (diff < 86400000) return Math.ceil(diff / 3600000) + 'h';
		return Math.ceil(diff / 86400000) + 'd';
	}

	// Selection
	function toggleSelect(id: string) {
		const newSet = new Set(selectedIds);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedIds = newSet;
	}

	function toggleSelectAll() {
		if (selectedIds.size === data.pastes.length) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(data.pastes.map(p => p.id));
		}
	}

	// Navigation with filters
	function applyFilters() {
		const params = new URLSearchParams($page.url.searchParams);
		if (searchQuery) {
			params.set('q', searchQuery);
		} else {
			params.delete('q');
		}
		params.set('page', '1');
		goto('/admin/pastes?' + params.toString());
	}

	function toggleFilter(name: string) {
		const params = new URLSearchParams($page.url.searchParams);
		if (params.get(name) === 'true') {
			params.delete(name);
		} else {
			params.set(name, 'true');
		}
		params.set('page', '1');
		goto('/admin/pastes?' + params.toString());
	}

	function setFilter(name: string, value: string) {
		const params = new URLSearchParams($page.url.searchParams);
		if (!value) {
			params.delete(name);
		} else {
			params.set(name, value);
		}
		params.set('page', '1');
		goto('/admin/pastes?' + params.toString());
	}

	function applySizeFilter() {
		const params = new URLSearchParams($page.url.searchParams);
		const multiplier = SIZE_UNITS[sizeUnit];

		if (sizeMinInput) {
			// Store in bytes
			params.set('sizeMin', String(parseInt(sizeMinInput) * multiplier));
		} else {
			params.delete('sizeMin');
		}
		if (sizeMaxInput) {
			// Store in bytes
			params.set('sizeMax', String(parseInt(sizeMaxInput) * multiplier));
		} else {
			params.delete('sizeMax');
		}
		params.set('page', '1');
		openFilter = null;
		goto('/admin/pastes?' + params.toString());
	}

	function clearSizeFilter() {
		sizeMinInput = '';
		sizeMaxInput = '';
		const params = new URLSearchParams($page.url.searchParams);
		params.delete('sizeMin');
		params.delete('sizeMax');
		params.set('page', '1');
		goto('/admin/pastes?' + params.toString());
	}

	function applyDateFilter() {
		const params = new URLSearchParams($page.url.searchParams);
		if (createdAfterInput) {
			params.set('createdAfter', createdAfterInput);
		} else {
			params.delete('createdAfter');
		}
		if (createdBeforeInput) {
			params.set('createdBefore', createdBeforeInput);
		} else {
			params.delete('createdBefore');
		}
		params.set('page', '1');
		openFilter = null;
		goto('/admin/pastes?' + params.toString());
	}

	function clearDateFilter() {
		createdAfterInput = '';
		createdBeforeInput = '';
		const params = new URLSearchParams($page.url.searchParams);
		params.delete('createdAfter');
		params.delete('createdBefore');
		params.set('page', '1');
		goto('/admin/pastes?' + params.toString());
	}

	function clearAllFilters() {
		searchQuery = '';
		sizeMinInput = '';
		sizeMaxInput = '';
		createdAfterInput = '';
		createdBeforeInput = '';
		goto('/admin/pastes');
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		goto('/admin/pastes?' + params.toString());
	}

	function setPageSize(size: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('limit', size.toString());
		params.set('page', '1'); // Reset to page 1 when changing size
		goto('/admin/pastes?' + params.toString());
	}

	function toggleSort(column: string) {
		const params = new URLSearchParams($page.url.searchParams);
		if (sortBy === column) {
			params.set('order', sortOrder === 'asc' ? 'desc' : 'asc');
		} else {
			params.set('sort', column);
			params.set('order', 'desc');
		}
		params.set('page', '1');
		goto('/admin/pastes?' + params.toString());
	}

	async function handleRefresh() {
		refreshing = true;
		await invalidateAll();
		setTimeout(() => refreshing = false, 500);
	}

	function handleSearch(e: Event) {
		e.preventDefault();
		applyFilters();
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.filter-popover') && !target.closest('.filter-trigger')) {
			openFilter = null;
		}
		if (!target.closest('.action-dropdown')) {
			activeDropdown = null;
		}
	}

	const activeFiltersCount = $derived(
		(hasPasswordFilter ? 1 : 0) + (burnFilter ? 1 : 0) + (sizeMin || sizeMax ? 1 : 0) + (statusFilter ? 1 : 0) + (searchQuery ? 1 : 0) + (createdAfter || createdBefore ? 1 : 0)
	);

	const allSelected = $derived(data.pastes.length > 0 && selectedIds.size === data.pastes.length);
</script>

<svelte:window onclick={handleClickOutside} />
<svelte:head><title>Pastes | CloakBin Admin</title></svelte:head>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-zinc-100">Pastes</h1>
			<p class="mt-1 text-sm text-zinc-400">{data.pagination.total} total pastes</p>
		</div>
		<button onclick={handleRefresh} disabled={refreshing} class="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-70 transition-colors">
			<RefreshCw class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
			{refreshing ? 'Refreshing...' : 'Refresh'}
		</button>
	</div>

	<!-- Toolbar: Search + Filter Chips -->
	<div class="flex flex-wrap items-center gap-2">
		<!-- Search -->
		<form onsubmit={handleSearch} class="relative flex-1 min-w-[200px] max-w-sm">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
			<input
				type="text"
				placeholder="Search paste ID..."
				bind:value={searchQuery}
				class="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder-zinc-500 focus:border-teal-500 focus:outline-none transition-colors"
			/>
		</form>

		<!-- Filter Chips -->
		<div class="flex flex-wrap items-center gap-2">
			<!-- Status Filter -->
			<div class="relative">
				<button
					onclick={() => openFilter = openFilter === 'status' ? null : 'status'}
					class="filter-trigger flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all
						{statusFilter ? 'border-teal-500/50 bg-teal-500/10 text-teal-400' : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'}"
				>
					Status{#if statusFilter}: <span class="font-medium">{statusFilter}</span>{/if}
				</button>
				{#if openFilter === 'status'}
					<div class="filter-popover absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-zinc-700 bg-zinc-800 p-1 shadow-xl">
						<button onclick={() => { setFilter('status', ''); openFilter = null; }}
							class="w-full rounded px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 {!statusFilter ? 'bg-zinc-700/50' : ''}">
							All
						</button>
						<button onclick={() => { setFilter('status', 'active'); openFilter = null; }}
							class="w-full rounded px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 {statusFilter === 'active' ? 'bg-zinc-700/50' : ''}">
							Active
						</button>
						<button onclick={() => { setFilter('status', 'expiring'); openFilter = null; }}
							class="w-full rounded px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 {statusFilter === 'expiring' ? 'bg-zinc-700/50' : ''}">
							Expiring soon
						</button>
						<button onclick={() => { setFilter('status', 'expired'); openFilter = null; }}
							class="w-full rounded px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 {statusFilter === 'expired' ? 'bg-zinc-700/50' : ''}">
							Expired
						</button>
					</div>
				{/if}
			</div>

			<!-- Size Filter -->
			<div class="relative">
				<button
					onclick={() => openFilter = openFilter === 'size' ? null : 'size'}
					class="filter-trigger flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all
						{sizeMin || sizeMax ? 'border-teal-500/50 bg-teal-500/10 text-teal-400' : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'}"
				>
					Size{#if sizeMin || sizeMax}: <span class="font-medium">{formatBytes(parseInt(sizeMin) || 0)}-{sizeMax ? formatBytes(parseInt(sizeMax)) : '∞'}</span>{/if}
				</button>
				{#if openFilter === 'size'}
					<div class="filter-popover absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-zinc-700 bg-zinc-800 p-3 shadow-xl">
						<div class="mb-3 flex items-center justify-between">
							<span class="text-xs font-medium text-zinc-400">Size range</span>
							<div class="flex rounded-md border border-zinc-600 text-xs">
								{#each ['B', 'KB', 'MB'] as unit}
									<button
										onclick={() => sizeUnit = unit as 'B' | 'KB' | 'MB'}
										class="px-2 py-0.5 transition-colors {sizeUnit === unit ? 'bg-teal-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}"
									>
										{unit}
									</button>
								{/each}
							</div>
						</div>
						<div class="flex items-center gap-2">
							<input
								type="number"
								placeholder="Min"
								bind:value={sizeMinInput}
								class="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-teal-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
							/>
							<span class="text-zinc-500">–</span>
							<input
								type="number"
								placeholder="Max"
								bind:value={sizeMaxInput}
								class="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-teal-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
							/>
							<span class="text-xs text-zinc-500 min-w-[24px]">{sizeUnit}</span>
						</div>
						<div class="mt-3 flex gap-2">
							<button onclick={clearSizeFilter} class="flex-1 rounded bg-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-600 transition-colors">
								Clear
							</button>
							<button onclick={applySizeFilter} class="flex-1 rounded bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500 transition-colors">
								Apply
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Date Filter -->
			<div class="relative">
				<button
					onclick={() => openFilter = openFilter === 'date' ? null : 'date'}
					class="filter-trigger flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all
						{createdAfter || createdBefore ? 'border-teal-500/50 bg-teal-500/10 text-teal-400' : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'}"
				>
					<Calendar class="h-3.5 w-3.5" />
					Date{#if createdAfter || createdBefore}: <span class="font-medium">{createdAfter ? 'from ' + createdAfter : ''}{createdBefore ? ' to ' + createdBefore : ''}</span>{/if}
				</button>
				{#if openFilter === 'date'}
					<div class="filter-popover absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-zinc-700 bg-zinc-800 p-3 shadow-xl">
						<div class="mb-3 text-xs font-medium text-zinc-400">Created date range</div>
						<div class="space-y-2">
							<div>
								<label class="text-xs text-zinc-500">After</label>
								<input
									type="date"
									bind:value={createdAfterInput}
									class="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-sm text-zinc-200 focus:border-teal-500 focus:outline-none date-input"
								/>
							</div>
							<div>
								<label class="text-xs text-zinc-500">Before</label>
								<input
									type="date"
									bind:value={createdBeforeInput}
									class="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-sm text-zinc-200 focus:border-teal-500 focus:outline-none date-input"
								/>
							</div>
						</div>
						<div class="mt-3 flex gap-2">
							<button onclick={clearDateFilter} class="flex-1 rounded bg-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-600 transition-colors">
								Clear
							</button>
							<button onclick={applyDateFilter} class="flex-1 rounded bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500 transition-colors">
								Apply
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Flag Toggles -->
			<button
				onclick={() => toggleFilter('password')}
				class="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all
					{hasPasswordFilter ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'}"
			>
				<Lock class="h-3.5 w-3.5" />
				Password
			</button>

			<button
				onclick={() => toggleFilter('burn')}
				class="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all
					{burnFilter ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'}"
			>
				<Flame class="h-3.5 w-3.5" />
				Burn
			</button>

			<!-- Clear All Filters -->
			{#if activeFiltersCount > 0}
				<button
					onclick={clearAllFilters}
					class="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-400 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-all"
				>
					<X class="h-3.5 w-3.5" />
					Clear ({activeFiltersCount})
				</button>
			{/if}
		</div>
	</div>

	<!-- Bulk Actions -->
	{#if selectedIds.size > 0}
		<div class="flex items-center gap-3 rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-2.5">
			<span class="text-sm font-medium text-teal-400">{selectedIds.size} selected</span>
			<form method="POST" action="?/bulkDelete" use:enhance={() => {
				deleting = true;
				return async ({ update }) => {
					await update();
					deleting = false;
					selectedIds = new Set();
				};
			}}>
				<input type="hidden" name="ids" value={Array.from(selectedIds).join(',')} />
				<button type="submit" disabled={deleting} class="flex items-center gap-1.5 rounded-md bg-red-500/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition-colors">
					<Trash2 class="h-3.5 w-3.5" />
					Delete selected
				</button>
			</form>
		</div>
	{/if}

	<!-- Table -->
	<div class="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
		<table class="w-full min-w-[640px] text-sm">
			<thead>
				<tr class="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
					<th class="w-12 px-4 py-3">
						<button onclick={toggleSelectAll} class="rounded p-1 hover:bg-zinc-700 transition-colors">
							{#if allSelected}
								<CheckSquare class="h-4 w-4 text-teal-400" />
							{:else}
								<Square class="h-4 w-4" />
							{/if}
						</button>
					</th>
					<th class="px-4 py-3">Paste ID</th>
					<th class="px-4 py-3">
						<button onclick={() => toggleSort('size')} class="group flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
							Size
							<span class="relative flex h-4 w-4 items-center justify-center">
								{#if sortBy === 'size'}
									<span class="sort-icon" style="transform: rotate({sortOrder === 'asc' ? '0deg' : '180deg'})">
										<ArrowUp class="h-3.5 w-3.5 text-teal-400" />
									</span>
								{:else}
									<ArrowUpDown class="h-3 w-3 opacity-30 group-hover:opacity-60 transition-opacity" />
								{/if}
							</span>
						</button>
					</th>
					<th class="px-4 py-3">
						<button onclick={() => toggleSort('created')} class="group flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
							Created
							<span class="relative flex h-4 w-4 items-center justify-center">
								{#if sortBy === 'created'}
									<span class="sort-icon" style="transform: rotate({sortOrder === 'asc' ? '0deg' : '180deg'})">
										<ArrowUp class="h-3.5 w-3.5 text-teal-400" />
									</span>
								{:else}
									<ArrowUpDown class="h-3 w-3 opacity-30 group-hover:opacity-60 transition-opacity" />
								{/if}
							</span>
						</button>
					</th>
					<th class="px-4 py-3">
						<button onclick={() => toggleSort('expires')} class="group flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
							Expires
							<span class="relative flex h-4 w-4 items-center justify-center">
								{#if sortBy === 'expires'}
									<span class="sort-icon" style="transform: rotate({sortOrder === 'asc' ? '0deg' : '180deg'})">
										<ArrowUp class="h-3.5 w-3.5 text-teal-400" />
									</span>
								{:else}
									<ArrowUpDown class="h-3 w-3 opacity-30 group-hover:opacity-60 transition-opacity" />
								{/if}
							</span>
						</button>
					</th>
					<th class="px-4 py-3">Flags</th>
					<th class="w-16 px-4 py-3"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-zinc-800/50">
				{#each data.pastes as paste, i}
					<tr class="group hover:bg-zinc-800/30 transition-colors">
						<td class="px-4 py-3">
							<button onclick={() => toggleSelect(paste.id)} class="rounded p-1 hover:bg-zinc-700 transition-colors">
								{#if selectedIds.has(paste.id)}
									<CheckSquare class="h-4 w-4 text-teal-400" />
								{:else}
									<Square class="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
								{/if}
							</button>
						</td>
						<td class="px-4 py-3">
							<a href="/admin/pastes/{paste.id}" class="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1 font-mono text-sm text-teal-400 hover:bg-zinc-700 hover:text-teal-300 transition-colors">
								{paste.id}
							</a>
						</td>
						<td class="px-4 py-3 text-zinc-400">{formatBytes(paste.sizeBytes)}</td>
						<td class="px-4 py-3 text-zinc-400">{timeAgo(paste.createdAt)}</td>
						<td class="px-4 py-3">
							<span class="{formatExpiry(paste.expiresAt) === 'Expired' ? 'text-red-400' : formatExpiry(paste.expiresAt).endsWith('m') || formatExpiry(paste.expiresAt).endsWith('h') ? 'text-amber-400' : 'text-zinc-400'}">
								{formatExpiry(paste.expiresAt)}
							</span>
						</td>
						<td class="px-4 py-3">
							<div class="flex gap-1">
								{#if paste.hasPassword}
									<span class="rounded-md bg-amber-500/10 p-1.5" title="Password Protected">
										<Lock class="h-3.5 w-3.5 text-amber-400" />
									</span>
								{/if}
								{#if paste.burnAfterRead}
									<span class="rounded-md bg-red-500/10 p-1.5" title="Burn After Read">
										<Flame class="h-3.5 w-3.5 text-red-400" />
									</span>
								{/if}
								{#if !paste.hasPassword && !paste.burnAfterRead}
									<span class="text-zinc-600">—</span>
								{/if}
							</div>
						</td>
						<td class="px-4 py-3">
							<div class="action-dropdown relative">
								<button onclick={() => activeDropdown = activeDropdown === paste.id ? null : paste.id}
									class="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition-colors">
									<MoreVertical class="h-4 w-4" />
								</button>
								{#if activeDropdown === paste.id}
									<div class="absolute right-0 z-20 w-36 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl
										{i >= Math.max(2, data.pastes.length - 3) ? 'bottom-full mb-1' : 'top-full mt-1'}">
										<a href="/p/{paste.id}" target="_blank" class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
											<Eye class="h-4 w-4" />
											View paste
										</a>
										<hr class="my-1 border-zinc-700" />
										<form method="POST" action="?/delete" use:enhance={() => {
											activeDropdown = null;
											return async ({ update }) => { await update(); };
										}}>
											<input type="hidden" name="id" value={paste.id} />
											<button type="submit" class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 transition-colors">
												<Trash2 class="h-4 w-4" />
												Delete
											</button>
										</form>
									</div>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		{#if data.pastes.length === 0}
			<div class="flex flex-col items-center justify-center py-16">
				<div class="rounded-full bg-zinc-800 p-4">
					<FileText class="h-8 w-8 text-zinc-600" />
				</div>
				<p class="mt-4 text-sm text-zinc-400">No pastes found</p>
				{#if activeFiltersCount > 0}
					<button onclick={clearAllFilters} class="mt-2 text-sm text-teal-400 hover:text-teal-300 transition-colors">
						Clear filters
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Pagination -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-4">
			<span class="text-sm text-zinc-500">
				{data.pagination.total} items
				{#if data.pagination.totalPages > 1}
					&middot; Page {data.pagination.page} of {data.pagination.totalPages}
				{/if}
			</span>

			<!-- Page Size Selector -->
			<div class="flex items-center gap-2">
				<span class="text-xs text-zinc-500">Show:</span>
				<select
					onchange={(e) => setPageSize(parseInt((e.target as HTMLSelectElement).value))}
					class="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-300 focus:border-teal-500 focus:outline-none"
				>
					{#each PAGE_SIZE_OPTIONS as size}
						<option value={size} selected={pageSize === size}>{size}</option>
					{/each}
				</select>
			</div>
		</div>

		{#if data.pagination.totalPages > 1}
			<div class="flex items-center gap-1">
				<button onclick={() => goToPage(1)} disabled={data.pagination.page === 1}
					class="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
					First
				</button>
				<button onclick={() => goToPage(data.pagination.page - 1)} disabled={data.pagination.page === 1}
					class="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
					<ChevronLeft class="h-4 w-4" />
				</button>
				{#each Array(Math.min(5, data.pagination.totalPages)) as _, i}
					{@const pageNum = data.pagination.totalPages <= 5 ? i + 1 :
						data.pagination.page <= 3 ? i + 1 :
						data.pagination.page >= data.pagination.totalPages - 2 ? data.pagination.totalPages - 4 + i :
						data.pagination.page - 2 + i}
					{#if pageNum >= 1 && pageNum <= data.pagination.totalPages}
						<button onclick={() => goToPage(pageNum)}
							class="rounded-lg border px-3 py-1.5 text-sm transition-colors
								{data.pagination.page === pageNum
									? 'border-teal-500 bg-teal-500/20 text-teal-400'
									: 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}">
							{pageNum}
						</button>
					{/if}
				{/each}
				<button onclick={() => goToPage(data.pagination.page + 1)} disabled={data.pagination.page === data.pagination.totalPages}
					class="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
					<ChevronRight class="h-4 w-4" />
				</button>
				<button onclick={() => goToPage(data.pagination.totalPages)} disabled={data.pagination.page === data.pagination.totalPages}
					class="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
					Last
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.sort-icon {
		display: inline-flex;
		transition: transform 0.2s ease-out;
	}

	/* Dark theme for date inputs */
	.date-input {
		color-scheme: dark;
	}
	.date-input::-webkit-calendar-picker-indicator {
		filter: invert(0.7);
		cursor: pointer;
	}
</style>
