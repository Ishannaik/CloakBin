<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		FileText, Lock, Flame, Trash2, Eye, MoreVertical,
		Search, Filter, CheckSquare, Square, ChevronLeft, ChevronRight, RefreshCw
	} from 'lucide-svelte';

	let { data } = $props();

	// Local UI state
	let searchQuery = $state($page.url.searchParams.get('q') || '');
	let filterOpen = $state(false);
	let activeDropdown = $state<string | null>(null);
	let selectedIds = $state<Set<string>>(new Set());
	let deleting = $state(false);

	// Filter state from URL
	const hasPasswordFilter = $derived($page.url.searchParams.get('password') === 'true');
	const burnFilter = $derived($page.url.searchParams.get('burn') === 'true');

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
		const params = new URLSearchParams();
		if (searchQuery) params.set('q', searchQuery);
		if (hasPasswordFilter) params.set('password', 'true');
		if (burnFilter) params.set('burn', 'true');
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

	function clearFilters() {
		searchQuery = '';
		goto('/admin/pastes');
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		goto('/admin/pastes?' + params.toString());
	}

	function handleSearch(e: Event) {
		e.preventDefault();
		applyFilters();
	}

	const activeFiltersCount = $derived(
		(hasPasswordFilter ? 1 : 0) + (burnFilter ? 1 : 0)
	);

	const allSelected = $derived(data.pastes.length > 0 && selectedIds.size === data.pastes.length);
</script>

<svelte:head><title>Pastes | CloakBin Admin</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-zinc-100">Pastes</h1>
			<p class="mt-1 text-sm text-zinc-400">{data.pagination.total} total</p>
		</div>
		<button onclick={() => invalidateAll()} class="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
			<RefreshCw class="h-4 w-4" /> Refresh
		</button>
	</div>

	<form onsubmit={handleSearch} class="flex gap-3">
		<div class="relative flex-1">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
			<input type="text" placeholder="Search by paste ID..." bind:value={searchQuery}
				class="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-teal-500 focus:outline-none" />
		</div>
		<button type="submit" class="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500">
			Search
		</button>
		<button type="button" onclick={() => filterOpen = !filterOpen}
			class="flex items-center gap-2 rounded-lg border {filterOpen || activeFiltersCount > 0 ? 'border-teal-500 bg-teal-500/10' : 'border-zinc-700 bg-zinc-800'} px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
			<Filter class="h-4 w-4" /> Filters
			{#if activeFiltersCount > 0}
				<span class="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-xs text-zinc-900">{activeFiltersCount}</span>
			{/if}
		</button>
	</form>

	{#if filterOpen}
		<div class="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
			<div class="flex items-center justify-between mb-4">
				<span class="text-sm font-medium text-zinc-200">Filters</span>
				<button onclick={clearFilters} class="text-xs text-zinc-400 hover:text-zinc-200">Clear all</button>
			</div>
			<div class="flex flex-wrap gap-4">
				<label class="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
					<input type="checkbox" checked={hasPasswordFilter} onchange={() => toggleFilter('password')} class="rounded border-zinc-600 bg-zinc-700 text-teal-500 focus:ring-teal-500" />
					<Lock class="h-3.5 w-3.5 text-amber-400" /> Password Protected
				</label>
				<label class="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
					<input type="checkbox" checked={burnFilter} onchange={() => toggleFilter('burn')} class="rounded border-zinc-600 bg-zinc-700 text-teal-500 focus:ring-teal-500" />
					<Flame class="h-3.5 w-3.5 text-red-400" /> Burn After Read
				</label>
			</div>
		</div>
	{/if}

	{#if selectedIds.size > 0}
		<div class="flex items-center gap-3 rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-3">
			<span class="text-sm text-teal-400">{selectedIds.size} selected</span>
			<form method="POST" action="?/bulkDelete" use:enhance={() => {
				deleting = true;
				return async ({ update }) => {
					await update();
					deleting = false;
					selectedIds = new Set();
				};
			}}>
				<input type="hidden" name="ids" value={Array.from(selectedIds).join(',')} />
				<button type="submit" disabled={deleting} class="flex items-center gap-1.5 text-sm text-red-400 hover:bg-red-500/10 px-2 py-1 rounded disabled:opacity-50">
					<Trash2 class="h-4 w-4" /> Delete
				</button>
			</form>
		</div>
	{/if}

	<div class="overflow-x-auto rounded-lg border border-zinc-800 bg-bg-secondary">
		<table class="w-full min-w-[640px] text-xs sm:text-sm">
			<thead>
				<tr class="border-b border-zinc-800 text-left text-xs uppercase text-zinc-500">
					<th class="px-4 py-3">
						<button onclick={toggleSelectAll}>
							{#if allSelected}<CheckSquare class="h-4 w-4 text-teal-400" />{:else}<Square class="h-4 w-4" />{/if}
						</button>
					</th>
					<th class="px-4 py-3">Paste ID</th>
					<th class="px-4 py-3">Size</th>
					<th class="px-4 py-3">Created</th>
					<th class="px-4 py-3">Expires</th>
					<th class="px-4 py-3">Flags</th>
					<th class="px-4 py-3">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-zinc-800">
				{#each data.pastes as paste, i}
					<tr class="hover:bg-zinc-800/50">
						<td class="px-4 py-3">
							<button onclick={() => toggleSelect(paste.id)}>
								{#if selectedIds.has(paste.id)}<CheckSquare class="h-4 w-4 text-teal-400" />{:else}<Square class="h-4 w-4 text-zinc-500" />{/if}
							</button>
						</td>
						<td class="px-4 py-3">
							<a href="/admin/pastes/{paste.id}" class="rounded bg-zinc-800 px-2 py-0.5 text-sm text-teal-400 hover:bg-zinc-700 hover:text-teal-300 transition-colors">{paste.id}</a>
						</td>
						<td class="px-4 py-3 text-sm text-zinc-400">{formatBytes(paste.sizeBytes)}</td>
						<td class="px-4 py-3 text-sm text-zinc-400">{timeAgo(paste.createdAt)}</td>
						<td class="px-4 py-3 text-sm text-zinc-400">{formatExpiry(paste.expiresAt)}</td>
						<td class="px-4 py-3">
							<div class="flex gap-1.5">
								{#if paste.hasPassword}<span class="rounded bg-amber-500/10 p-1" title="Password Protected"><Lock class="h-3.5 w-3.5 text-amber-400" /></span>{/if}
								{#if paste.burnAfterRead}<span class="rounded bg-red-500/10 p-1" title="Burn After Read"><Flame class="h-3.5 w-3.5 text-red-400" /></span>{/if}
							</div>
						</td>
						<td class="px-4 py-3">
							<div class="relative">
								<button onclick={() => activeDropdown = activeDropdown === paste.id ? null : paste.id} class="rounded p-1.5 hover:bg-zinc-700">
									<MoreVertical class="h-4 w-4 text-zinc-400" />
								</button>
								{#if activeDropdown === paste.id}
									<div class="absolute right-0 z-10 w-36 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl {i >= Math.max(2, data.pastes.length - 3) ? 'bottom-full mb-1' : 'top-full mt-1'}">
										<a href="/p/{paste.id}" target="_blank" class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700"><Eye class="h-4 w-4" /> View</a>
										<hr class="my-1 border-zinc-700" />
										<form method="POST" action="?/delete" use:enhance={() => {
											activeDropdown = null;
											return async ({ update }) => {
												await update();
											};
										}}>
											<input type="hidden" name="id" value={paste.id} />
											<button type="submit" class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700"><Trash2 class="h-4 w-4" /> Delete</button>
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
			<div class="px-4 py-12 text-center"><FileText class="mx-auto h-8 w-8 text-zinc-600" /><p class="mt-2 text-sm text-zinc-400">No pastes found</p></div>
		{/if}
	</div>

	{#if data.pagination.totalPages > 1}
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<span class="text-sm text-zinc-500">
				Page {data.pagination.page} of {data.pagination.totalPages}
			</span>
			<div class="flex items-center gap-1">
				<button onclick={() => goToPage(1)} disabled={data.pagination.page === 1}
					class="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed">
					First
				</button>
				<button onclick={() => goToPage(data.pagination.page - 1)} disabled={data.pagination.page === 1}
					class="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed">
					<ChevronLeft class="h-4 w-4" />
				</button>
				{#each Array(Math.min(5, data.pagination.totalPages)) as _, i}
					{@const pageNum = data.pagination.totalPages <= 5 ? i + 1 :
						data.pagination.page <= 3 ? i + 1 :
						data.pagination.page >= data.pagination.totalPages - 2 ? data.pagination.totalPages - 4 + i :
						data.pagination.page - 2 + i}
					{#if pageNum >= 1 && pageNum <= data.pagination.totalPages}
						<button onclick={() => goToPage(pageNum)}
							class="rounded-lg border px-3 py-1.5 text-sm {data.pagination.page === pageNum ? 'border-teal-500 bg-teal-500/20 text-teal-400' : 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}">
							{pageNum}
						</button>
					{/if}
				{/each}
				<button onclick={() => goToPage(data.pagination.page + 1)} disabled={data.pagination.page === data.pagination.totalPages}
					class="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed">
					<ChevronRight class="h-4 w-4" />
				</button>
				<button onclick={() => goToPage(data.pagination.totalPages)} disabled={data.pagination.page === data.pagination.totalPages}
					class="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed">
					Last
				</button>
			</div>
		</div>
	{/if}
</div>
