<script lang="ts">
	import {
		Users, Shield, Ban, MoreVertical, Search, Filter,
		CheckSquare, Square, Mail, Calendar, FileText, Trash2
	} from 'lucide-svelte';

	let users = ([
		{ id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', provider: 'google', pastes: 45, joined: '2024-01-15', lastLogin: '2 hours ago', banned: false, selected: false },
		{ id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'user', provider: 'github', pastes: 128, joined: '2024-02-20', lastLogin: '1 day ago', banned: false, selected: false },
		{ id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'user', provider: 'google', pastes: 12, joined: '2024-03-10', lastLogin: '1 week ago', banned: true, selected: false },
		{ id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'user', provider: 'github', pastes: 89, joined: '2024-04-05', lastLogin: '3 hours ago', banned: false, selected: false },
	]);

	let searchQuery = ('');
	let activeDropdown = <string | null>(null);
	let selectAll = (false);

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

	const selectedCount = (users.filter(u => u.selected).length);
	const filteredUsers = (users.filter(u => {
		if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && !u.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
		return true;
	}));
</script>

<svelte:head><title>Users | CloakBin Admin</title></svelte:head>

<div class="space-y-4 sm:space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-xl font-semibold text-zinc-100 sm:text-2xl">Users</h1>
			<p class="mt-1 text-sm text-zinc-400">{users.length} registered users</p>
		</div>
	</div>

	<div class="flex flex-col gap-3 sm:flex-row">
		<div class="relative flex-1">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
			<input type="text" placeholder="Search by name or email..." bind:value={searchQuery}
				class="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-teal-500 focus:outline-none" />
		</div>
	</div>

	{#if selectedCount > 0}
		<div class="flex flex-wrap items-center gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
			<span class="text-sm text-teal-400">{selectedCount} selected</span>
			<button class="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-red-400 hover:bg-red-500/10">
				<Ban class="h-4 w-4" /> <span class="hidden sm:inline">Ban Selected</span>
			</button>
		</div>
	{/if}

	<div class="overflow-x-auto rounded-lg border border-zinc-800 bg-[#242830]">
		<table class="w-full min-w-[700px]">
			<thead>
				<tr class="border-b border-zinc-800 text-left text-xs uppercase text-zinc-500">
					<th class="px-3 py-3 sm:px-4">
						<button onclick={toggleSelectAll}>
							{#if selectAll}<CheckSquare class="h-4 w-4 text-teal-400" />{:else}<Square class="h-4 w-4" />{/if}
						</button>
					</th>
					<th class="px-3 py-3 sm:px-4">User</th>
					<th class="hidden px-3 py-3 sm:table-cell sm:px-4">Role</th>
					<th class="hidden px-3 py-3 md:table-cell md:px-4">Pastes</th>
					<th class="hidden px-3 py-3 lg:table-cell lg:px-4">Joined</th>
					<th class="px-3 py-3 sm:px-4">Last Login</th>
					<th class="px-3 py-3 sm:px-4">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-zinc-800">
				{#each filteredUsers as user}
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
									<div class="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
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
</div>
