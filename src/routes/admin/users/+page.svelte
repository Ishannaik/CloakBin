<script lang="ts">
	import {
		Users, Shield, Ban, MoreVertical, Search, Filter,
		CheckSquare, Square, Mail, Calendar, FileText, Trash2, ChevronUp, ChevronDown,
		ChevronLeft, ChevronRight
	} from 'lucide-svelte';

	type SortField = 'name' | 'role' | 'pastes' | 'joined' | null;
	type SortDirection = 'asc' | 'desc';

	let users = $state([
		{ id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', provider: 'google', pastes: 45, joined: '2024-01-15', joinedTs: new Date('2024-01-15').getTime(), lastLogin: '2 hours ago', banned: false, selected: false },
		{ id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'user', provider: 'github', pastes: 128, joined: '2024-02-20', joinedTs: new Date('2024-02-20').getTime(), lastLogin: '1 day ago', banned: false, selected: false },
		{ id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'user', provider: 'google', pastes: 12, joined: '2024-03-10', joinedTs: new Date('2024-03-10').getTime(), lastLogin: '1 week ago', banned: true, selected: false },
		{ id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'user', provider: 'github', pastes: 89, joined: '2024-04-05', joinedTs: new Date('2024-04-05').getTime(), lastLogin: '3 hours ago', banned: false, selected: false },
	]);

	let searchQuery = $state('');
	let activeDropdown = $state<string | null>(null);
	let selectAll = $state(false);
	let filterOpen = $state(false);
	let filters = $state({ role: 'all', provider: 'all', banned: 'all' });
	let sortField = $state<SortField>(null);
	let sortDirection = $state<SortDirection>('desc');

	// Pagination
	let currentPage = $state(1);
	let itemsPerPage = $state(10);
	const itemsPerPageOptions = [10, 25, 50, 100];

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
		users = users.map(u => ({ ...u, selected: selectAll }));
	}

	function toggleSelect(id: string) {
		users = users.map(u => u.id === id ? { ...u, selected: !u.selected } : u);
	}

	function toggleBan(id: string) {
		users = users.map(u => u.id === id ? { ...u, banned: !u.banned } : u);
		activeDropdown = null;
	}

	function setRole(id: string, role: string) {
		users = users.map(u => u.id === id ? { ...u, role } : u);
		activeDropdown = null;
	}

	function clearFilters() {
		filters = { role: 'all', provider: 'all', banned: 'all' };
		searchQuery = '';
	}

	const selectedCount = $derived(users.filter(u => u.selected).length);
	const activeFiltersCount = $derived(
		(filters.role !== 'all' ? 1 : 0) +
		(filters.provider !== 'all' ? 1 : 0) +
		(filters.banned !== 'all' ? 1 : 0)
	);

	const filteredUsers = $derived.by(() => {
		let result = users.filter(u => {
			if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && !u.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
			if (filters.role !== 'all' && u.role !== filters.role) return false;
			if (filters.provider !== 'all' && u.provider !== filters.provider) return false;
			if (filters.banned === 'banned' && !u.banned) return false;
			if (filters.banned === 'active' && u.banned) return false;
			return true;
		});

		if (sortField) {
			result = [...result].sort((a, b) => {
				let comparison = 0;
				switch (sortField) {
					case 'name':
						comparison = a.name.localeCompare(b.name);
						break;
					case 'role':
						comparison = a.role.localeCompare(b.role);
						break;
					case 'pastes':
						comparison = a.pastes - b.pastes;
						break;
					case 'joined':
						comparison = a.joinedTs - b.joinedTs;
						break;
				}
				return sortDirection === 'asc' ? comparison : -comparison;
			});
		}

		return result;
	});

	// Pagination derived values
	const totalPages = $derived(Math.ceil(filteredUsers.length / itemsPerPage));
	const paginatedUsers = $derived.by(() => {
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		return filteredUsers.slice(start, end);
	});

	// Reset to page 1 when filters/search change
	$effect(() => {
		filters; searchQuery; itemsPerPage;
		currentPage = 1;
	});

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
		}
	}
</script>

<svelte:head><title>Users | CloakBin Admin</title></svelte:head>

<div class="space-y-4 sm:space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-xl font-semibold text-zinc-100 sm:text-2xl">Users</h1>
			<p class="mt-1 text-sm text-zinc-400">{users.length} total · {filteredUsers.length} shown</p>
		</div>
	</div>

	<div class="flex flex-col gap-3 sm:flex-row">
		<div class="relative flex-1">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
			<input type="text" placeholder="Search by name or email..." bind:value={searchQuery}
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
			<div class="grid gap-4 sm:grid-cols-3">
				<!-- Role Filter -->
				<div>
					<label class="block text-xs text-zinc-400 mb-1.5">Role</label>
					<select bind:value={filters.role}
						class="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-200 focus:border-teal-500 focus:outline-none">
						<option value="all">All Roles</option>
						<option value="admin">Admin</option>
						<option value="user">User</option>
					</select>
				</div>
				<!-- Provider Filter -->
				<div>
					<label class="block text-xs text-zinc-400 mb-1.5">Provider</label>
					<select bind:value={filters.provider}
						class="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-200 focus:border-teal-500 focus:outline-none">
						<option value="all">All Providers</option>
						<option value="google">Google</option>
						<option value="github">GitHub</option>
					</select>
				</div>
				<!-- Status Filter -->
				<div>
					<label class="block text-xs text-zinc-400 mb-1.5">Status</label>
					<select bind:value={filters.banned}
						class="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-200 focus:border-teal-500 focus:outline-none">
						<option value="all">All Status</option>
						<option value="active">Active</option>
						<option value="banned">Banned</option>
					</select>
				</div>
			</div>
		</div>
	{/if}

	{#if selectedCount > 0}
		<div class="flex flex-wrap items-center gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
			<span class="text-sm text-teal-400">{selectedCount} selected</span>
			<button class="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-red-400 hover:bg-red-500/10">
				<Ban class="h-4 w-4" /> <span class="hidden sm:inline">Ban Selected</span>
			</button>
		</div>
	{/if}

	<div class="overflow-x-auto rounded-lg border border-zinc-800 bg-[#242830]">
		<table class="w-full min-w-[700px] text-xs sm:text-sm">
			<thead>
				<tr class="border-b border-zinc-800 text-left text-xs uppercase text-zinc-500">
					<th class="px-3 py-3 sm:px-4">
						<button onclick={toggleSelectAll}>
							{#if selectAll}<CheckSquare class="h-4 w-4 text-teal-400" />{:else}<Square class="h-4 w-4" />{/if}
						</button>
					</th>
					<th class="px-3 py-3 sm:px-4">
						<button onclick={() => toggleSort('name')} class="flex items-center gap-1 hover:text-zinc-300">
							User
							{#if sortField === 'name'}
								{#if sortDirection === 'asc'}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
							{/if}
						</button>
					</th>
					<th class="hidden px-3 py-3 sm:table-cell sm:px-4">
						<button onclick={() => toggleSort('role')} class="flex items-center gap-1 hover:text-zinc-300">
							Role
							{#if sortField === 'role'}
								{#if sortDirection === 'asc'}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
							{/if}
						</button>
					</th>
					<th class="hidden px-3 py-3 md:table-cell md:px-4">
						<button onclick={() => toggleSort('pastes')} class="flex items-center gap-1 hover:text-zinc-300">
							Pastes
							{#if sortField === 'pastes'}
								{#if sortDirection === 'asc'}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
							{/if}
						</button>
					</th>
					<th class="hidden px-3 py-3 lg:table-cell lg:px-4">
						<button onclick={() => toggleSort('joined')} class="flex items-center gap-1 hover:text-zinc-300">
							Joined
							{#if sortField === 'joined'}
								{#if sortDirection === 'asc'}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
							{/if}
						</button>
					</th>
					<th class="px-3 py-3 sm:px-4">Last Login</th>
					<th class="px-3 py-3 sm:px-4">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-zinc-800">
				{#each paginatedUsers as user, i}
					<tr class="hover:bg-zinc-800/50 {user.banned ? 'bg-red-500/5' : ''}">
						<td class="px-3 py-3 sm:px-4">
							<button onclick={() => toggleSelect(user.id)}>
								{#if user.selected}<CheckSquare class="h-4 w-4 text-teal-400" />{:else}<Square class="h-4 w-4 text-zinc-500" />{/if}
							</button>
						</td>
						<td class="px-3 py-3 sm:px-4">
							<div class="flex items-center gap-3">
								<div class="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-zinc-300">
									{user.name.charAt(0)}
								</div>
								<div>
									<div class="flex items-center gap-2">
										<span class="text-sm font-medium text-zinc-200">{user.name}</span>
										{#if user.banned}<span class="rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">Banned</span>{/if}
									</div>
									<span class="text-xs text-zinc-500">{user.email}</span>
								</div>
							</div>
						</td>
						<td class="hidden px-3 py-3 sm:table-cell sm:px-4">
							<span class="rounded px-2 py-0.5 text-xs font-medium {user.role === 'admin' ? 'bg-teal-500/20 text-teal-400' : 'bg-zinc-700 text-zinc-300'}">{user.role}</span>
						</td>
						<td class="hidden px-3 py-3 text-sm text-zinc-400 md:table-cell md:px-4">{user.pastes}</td>
						<td class="hidden px-3 py-3 text-sm text-zinc-400 lg:table-cell lg:px-4">{user.joined}</td>
						<td class="px-3 py-3 text-sm text-zinc-400 sm:px-4">{user.lastLogin}</td>
						<td class="px-3 py-3 sm:px-4">
							<div class="relative">
								<button onclick={() => activeDropdown = activeDropdown === user.id ? null : user.id} class="rounded p-1.5 hover:bg-zinc-700">
									<MoreVertical class="h-4 w-4 text-zinc-400" />
								</button>
								{#if activeDropdown === user.id}
									<div class="absolute right-0 z-10 w-48 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl {i >= Math.max(2, paginatedUsers.length - 3) ? 'bottom-full mb-1' : 'top-full mt-1'}">
										<button onclick={() => setRole(user.id, user.role === 'admin' ? 'user' : 'admin')} class="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
											<Shield class="h-4 w-4" /> {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
										</button>
										<button onclick={() => toggleBan(user.id)} class="flex w-full items-center gap-2 px-3 py-2 text-sm {user.banned ? 'text-emerald-400' : 'text-red-400'} hover:bg-zinc-700">
											<Ban class="h-4 w-4" /> {user.banned ? 'Unban User' : 'Ban User'}
										</button>
										<hr class="my-1 border-zinc-700" />
										<button class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700">
											<Trash2 class="h-4 w-4" /> Delete User
										</button>
									</div>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if filteredUsers.length === 0}
			<div class="px-4 py-12 text-center">
				<Users class="mx-auto h-8 w-8 text-zinc-600" />
				<p class="mt-2 text-sm text-zinc-400">No users found</p>
			</div>
		{/if}
	</div>

	<!-- Pagination -->
	{#if filteredUsers.length > 0}
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-2">
				<span class="text-sm text-zinc-400">Rows per page:</span>
				<select bind:value={itemsPerPage}
					class="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-teal-500 focus:outline-none">
					{#each itemsPerPageOptions as opt}
						<option value={opt}>{opt}</option>
					{/each}
				</select>
				<span class="text-sm text-zinc-500 ml-2">
					Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
				</span>
			</div>
			<div class="flex items-center gap-1">
				<button onclick={() => goToPage(1)} disabled={currentPage === 1}
					class="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed">
					First
				</button>
				<button onclick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
					class="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed">
					<ChevronLeft class="h-4 w-4" />
				</button>
				{#each Array(Math.min(5, totalPages)) as _, idx}
					{@const pageNum = totalPages <= 5 ? idx + 1 :
						currentPage <= 3 ? idx + 1 :
						currentPage >= totalPages - 2 ? totalPages - 4 + idx :
						currentPage - 2 + idx}
					{#if pageNum >= 1 && pageNum <= totalPages}
						<button onclick={() => goToPage(pageNum)}
							class="rounded-lg border px-3 py-1.5 text-sm {currentPage === pageNum ? 'border-teal-500 bg-teal-500/20 text-teal-400' : 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}">
							{pageNum}
						</button>
					{/if}
				{/each}
				<button onclick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
					class="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed">
					<ChevronRight class="h-4 w-4" />
				</button>
				<button onclick={() => goToPage(totalPages)} disabled={currentPage === totalPages}
					class="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed">
					Last
				</button>
			</div>
		</div>
	{/if}
</div>
