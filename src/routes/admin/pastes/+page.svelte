<script lang="ts">
	import {
		FileText, Lock, Flame, Trash2, Flag, Eye, MoreVertical,
		Search, Filter, CheckSquare, Square, AlertTriangle, Ban, Download, RefreshCw,
		ChevronUp, ChevronDown, X
	} from 'lucide-svelte';

	type SortField = 'id' | 'size' | 'created' | 'expires' | null;
	type SortDirection = 'asc' | 'desc';

	// Raw paste data with numeric values for sorting
	let pastesRaw = $state([
		{ id: 'aB3xKp2m', sizeBytes: 2458, sizeDisplay: '2.4 KB', createdAt: Date.now() - 5 * 60 * 1000, createdDisplay: '5 min ago', expires: '24h', expiresOrder: 2, hasPassword: true, burnAfterRead: false, flagged: false, selected: false },
		{ id: 'xK9mPq2w', sizeBytes: 15565, sizeDisplay: '15.2 KB', createdAt: Date.now() - 12 * 60 * 1000, createdDisplay: '12 min ago', expires: '7d', expiresOrder: 3, hasPassword: false, burnAfterRead: true, flagged: true, selected: false },
		{ id: 'zY7wRt4n', sizeBytes: 892, sizeDisplay: '892 B', createdAt: Date.now() - 60 * 60 * 1000, createdDisplay: '1 hour ago', expires: '1h', expiresOrder: 1, hasPassword: false, burnAfterRead: false, flagged: false, selected: false },
		{ id: 'mN5vBx8k', sizeBytes: 4198, sizeDisplay: '4.1 KB', createdAt: Date.now() - 2 * 60 * 60 * 1000, createdDisplay: '2 hours ago', expires: 'Never', expiresOrder: 5, hasPassword: true, burnAfterRead: false, flagged: false, selected: false },
		{ id: 'pL2jHs6q', sizeBytes: 29389, sizeDisplay: '28.7 KB', createdAt: Date.now() - 3 * 60 * 60 * 1000, createdDisplay: '3 hours ago', expires: '24h', expiresOrder: 2, hasPassword: false, burnAfterRead: false, flagged: true, selected: false },
	]);

	let searchQuery = $state('');
	let filterOpen = $state(false);
	let activeDropdown = $state<string | null>(null);
	let selectAll = $state(false);
	let filters = $state({ hasPassword: false, burnAfterRead: false, flagged: false, expiryFilter: 'all' as string });
	let sortField = $state<SortField>(null);
	let sortDirection = $state<SortDirection>('desc');

	function toggleSort(field: SortField) {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = 'desc';
		}
	}

	function toggleSelectAll() {
		selectAll = !selectAll;
		pastesRaw = pastesRaw.map(p => ({ ...p, selected: selectAll }));
	}

	function toggleSelect(id: string) {
		pastesRaw = pastesRaw.map(p => p.id === id ? { ...p, selected: !p.selected } : p);
	}

	function deletePaste(id: string) {
		if (confirm('Delete paste ' + id + '?')) {
			pastesRaw = pastesRaw.filter(p => p.id !== id);
		}
		activeDropdown = null;
	}

	function flagPaste(id: string) {
		pastesRaw = pastesRaw.map(p => p.id === id ? { ...p, flagged: !p.flagged } : p);
		activeDropdown = null;
	}

	function deleteSelected() {
		pastesRaw = pastesRaw.filter(p => !p.selected);
	}

	function clearFilters() {
		filters = { hasPassword: false, burnAfterRead: false, flagged: false, expiryFilter: 'all' };
		searchQuery = '';
	}

	const selectedCount = $derived(pastesRaw.filter(p => p.selected).length);
	const activeFiltersCount = $derived(
		(filters.hasPassword ? 1 : 0) +
		(filters.burnAfterRead ? 1 : 0) +
		(filters.flagged ? 1 : 0) +
		(filters.expiryFilter !== 'all' ? 1 : 0)
	);

	const filteredPastes = $derived.by(() => {
		let result = pastesRaw.filter(p => {
			if (searchQuery && !p.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
			if (filters.hasPassword && !p.hasPassword) return false;
			if (filters.burnAfterRead && !p.burnAfterRead) return false;
			if (filters.flagged && !p.flagged) return false;
			if (filters.expiryFilter !== 'all' && p.expires !== filters.expiryFilter) return false;
			return true;
		});

		// Sort
		if (sortField) {
			result = [...result].sort((a, b) => {
				let comparison = 0;
				switch (sortField) {
					case 'id':
						comparison = a.id.localeCompare(b.id);
						break;
					case 'size':
						comparison = a.sizeBytes - b.sizeBytes;
						break;
					case 'created':
						comparison = a.createdAt - b.createdAt;
						break;
					case 'expires':
						comparison = a.expiresOrder - b.expiresOrder;
						break;
				}
				return sortDirection === 'asc' ? comparison : -comparison;
			});
		}

		return result;
	});

	const expiryOptions = ['all', '1h', '24h', '7d', '30d', 'Never'];
</script>

<svelte:head><title>Pastes | CloakBin Admin</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-zinc-100">Pastes</h1>
			<p class="mt-1 text-sm text-zinc-400">{pastesRaw.length} total · {filteredPastes.length} shown</p>
		</div>
		<button class="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
			<RefreshCw class="h-4 w-4" /> Refresh
		</button>
	</div>

	<div class="flex gap-3">
		<div class="relative flex-1">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
			<input type="text" placeholder="Search by paste ID..." bind:value={searchQuery}
				class="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-teal-500 focus:outline-none" />
		</div>
		<button onclick={() => filterOpen = !filterOpen}
			class="flex items-center gap-2 rounded-lg border {filterOpen || activeFiltersCount > 0 ? 'border-teal-500 bg-teal-500/10' : 'border-zinc-700 bg-zinc-800'} px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
			<Filter class="h-4 w-4" /> Filters
			{#if activeFiltersCount > 0}
				<span class="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-xs text-zinc-900">{activeFiltersCount}</span>
			{/if}
		</button>
	</div>

	<!-- Filter Panel -->
	{#if filterOpen}
		<div class="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
			<div class="flex items-center justify-between mb-4">
				<span class="text-sm font-medium text-zinc-200">Filters</span>
				<button onclick={clearFilters} class="text-xs text-zinc-400 hover:text-zinc-200">Clear all</button>
			</div>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<!-- Expiry Filter -->
				<div>
					<label class="block text-xs text-zinc-400 mb-1.5">Expiry</label>
					<select bind:value={filters.expiryFilter}
						class="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-200 focus:border-teal-500 focus:outline-none">
						{#each expiryOptions as opt}
							<option value={opt}>{opt === 'all' ? 'All' : opt}</option>
						{/each}
					</select>
				</div>
				<!-- Feature Toggles -->
				<div class="flex flex-col gap-2">
					<label class="block text-xs text-zinc-400 mb-0.5">Features</label>
					<label class="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
						<input type="checkbox" bind:checked={filters.hasPassword} class="rounded border-zinc-600 bg-zinc-700 text-teal-500 focus:ring-teal-500" />
						<Lock class="h-3.5 w-3.5 text-amber-400" /> Password
					</label>
					<label class="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
						<input type="checkbox" bind:checked={filters.burnAfterRead} class="rounded border-zinc-600 bg-zinc-700 text-teal-500 focus:ring-teal-500" />
						<Flame class="h-3.5 w-3.5 text-red-400" /> Burn
					</label>
				</div>
				<!-- Status -->
				<div class="flex flex-col gap-2">
					<label class="block text-xs text-zinc-400 mb-0.5">Status</label>
					<label class="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
						<input type="checkbox" bind:checked={filters.flagged} class="rounded border-zinc-600 bg-zinc-700 text-teal-500 focus:ring-teal-500" />
						<AlertTriangle class="h-3.5 w-3.5 text-amber-400" /> Flagged
					</label>
				</div>
			</div>
		</div>
	{/if}

	{#if selectedCount > 0}
		<div class="flex items-center gap-3 rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-3">
			<span class="text-sm text-teal-400">{selectedCount} selected</span>
			<button onclick={deleteSelected} class="flex items-center gap-1.5 text-sm text-red-400 hover:bg-red-500/10 px-2 py-1 rounded">
				<Trash2 class="h-4 w-4" /> Delete
			</button>
			<button onclick={() => pastesRaw = pastesRaw.map(p => p.selected ? {...p, flagged: true} : p)}
				class="flex items-center gap-1.5 text-sm text-amber-400 hover:bg-amber-500/10 px-2 py-1 rounded">
				<Flag class="h-4 w-4" /> Flag DMCA
			</button>
		</div>
	{/if}

	<div class="overflow-hidden rounded-lg border border-zinc-800 bg-[#242830]">
		<table class="w-full">
			<thead>
				<tr class="border-b border-zinc-800 text-left text-xs uppercase text-zinc-500">
					<th class="px-4 py-3"><button onclick={toggleSelectAll}>{#if selectAll}<CheckSquare class="h-4 w-4 text-teal-400" />{:else}<Square class="h-4 w-4" />{/if}</button></th>
					<th class="px-4 py-3">
						<button onclick={() => toggleSort('id')} class="flex items-center gap-1 hover:text-zinc-300">
							Paste ID
							{#if sortField === 'id'}
								{#if sortDirection === 'asc'}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
							{/if}
						</button>
					</th>
					<th class="px-4 py-3">
						<button onclick={() => toggleSort('size')} class="flex items-center gap-1 hover:text-zinc-300">
							Size
							{#if sortField === 'size'}
								{#if sortDirection === 'asc'}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
							{/if}
						</button>
					</th>
					<th class="px-4 py-3">
						<button onclick={() => toggleSort('created')} class="flex items-center gap-1 hover:text-zinc-300">
							Created
							{#if sortField === 'created'}
								{#if sortDirection === 'asc'}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
							{/if}
						</button>
					</th>
					<th class="px-4 py-3">
						<button onclick={() => toggleSort('expires')} class="flex items-center gap-1 hover:text-zinc-300">
							Expires
							{#if sortField === 'expires'}
								{#if sortDirection === 'asc'}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
							{/if}
						</button>
					</th>
					<th class="px-4 py-3">Flags</th>
					<th class="px-4 py-3">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-zinc-800">
				{#each filteredPastes as paste, i}
					<tr class="hover:bg-zinc-800/50 {paste.flagged ? 'bg-red-500/5' : ''}">
						<td class="px-4 py-3"><button onclick={() => toggleSelect(paste.id)}>{#if paste.selected}<CheckSquare class="h-4 w-4 text-teal-400" />{:else}<Square class="h-4 w-4 text-zinc-500" />{/if}</button></td>
						<td class="px-4 py-3">
							<div class="flex items-center gap-2">
								<a href="/admin/pastes/{paste.id}" class="rounded bg-zinc-800 px-2 py-0.5 text-sm text-teal-400 hover:bg-zinc-700 hover:text-teal-300 transition-colors">{paste.id}</a>
								{#if paste.flagged}<AlertTriangle class="h-4 w-4 text-amber-400" />{/if}
							</div>
						</td>
						<td class="px-4 py-3 text-sm text-zinc-400">{paste.sizeDisplay}</td>
						<td class="px-4 py-3 text-sm text-zinc-400">{paste.createdDisplay}</td>
						<td class="px-4 py-3 text-sm text-zinc-400">{paste.expires}</td>
						<td class="px-4 py-3">
							<div class="flex gap-1.5">
								{#if paste.hasPassword}<span class="rounded bg-amber-500/10 p-1"><Lock class="h-3.5 w-3.5 text-amber-400" /></span>{/if}
								{#if paste.burnAfterRead}<span class="rounded bg-red-500/10 p-1"><Flame class="h-3.5 w-3.5 text-red-400" /></span>{/if}
							</div>
						</td>
						<td class="px-4 py-3">
							<div class="relative">
								<button onclick={() => activeDropdown = activeDropdown === paste.id ? null : paste.id} class="rounded p-1.5 hover:bg-zinc-700">
									<MoreVertical class="h-4 w-4 text-zinc-400" />
								</button>
								{#if activeDropdown === paste.id}
									<div class="absolute right-0 z-10 w-44 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl {i >= filteredPastes.length - 2 ? 'bottom-full mb-1' : 'top-full mt-1'}">
										<a href="/p/{paste.id}" target="_blank" class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700"><Eye class="h-4 w-4" /> View</a>
										<button onclick={() => flagPaste(paste.id)} class="flex w-full items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-zinc-700"><Flag class="h-4 w-4" /> {paste.flagged ? 'Unflag' : 'Flag DMCA'}</button>
										<button class="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700"><Ban class="h-4 w-4" /> Block IP</button>
										<hr class="my-1 border-zinc-700" />
										<button onclick={() => deletePaste(paste.id)} class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700"><Trash2 class="h-4 w-4" /> Delete</button>
									</div>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if filteredPastes.length === 0}
			<div class="px-4 py-12 text-center"><FileText class="mx-auto h-8 w-8 text-zinc-600" /><p class="mt-2 text-sm text-zinc-400">No pastes found</p></div>
		{/if}
	</div>
</div>
