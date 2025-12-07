<script lang="ts">
	import {
		LayoutDashboard,
		FileText,
		Users,
		BarChart3,
		Settings,
		LogOut,
		Menu,
		X
	} from 'lucide-svelte';
	import { page } from '$app/stores';

	let { children } = $props();
	let sidebarOpen = $state(false);

	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/admin/pastes', label: 'Pastes', icon: FileText },
		{ href: '/admin/users', label: 'Users', icon: Users },
		{ href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
		{ href: '/admin/settings', label: 'Settings', icon: Settings }
	];

	function isActive(href: string): boolean {
		if (href === '/admin') {
			return $page.url.pathname === '/admin';
		}
		return $page.url.pathname.startsWith(href);
	}
</script>

<div class="flex min-h-screen bg-[#1a1d23]">
	<!-- Mobile menu button -->
	<button
		class="fixed left-4 top-4 z-50 rounded-lg bg-zinc-800 p-2 lg:hidden"
		onclick={() => (sidebarOpen = !sidebarOpen)}
	>
		{#if sidebarOpen}
			<X class="h-5 w-5 text-zinc-300" />
		{:else}
			<Menu class="h-5 w-5 text-zinc-300" />
		{/if}
	</button>

	<!-- Sidebar -->
	<aside
		class="fixed inset-y-0 left-0 z-40 w-64 transform border-r border-zinc-800 bg-[#1a1d23] transition-transform lg:relative lg:translate-x-0
		{sidebarOpen ? 'translate-x-0' : '-translate-x-full'}"
	>
		<!-- Logo -->
		<div class="flex h-16 items-center gap-3 border-b border-zinc-800 px-6">
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20">
				<span class="text-lg font-bold text-teal-400">C</span>
			</div>
			<span class="text-lg font-semibold text-zinc-100">CloakBin</span>
			<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">Admin</span>
		</div>

		<!-- Navigation -->
		<nav class="mt-6 space-y-1 px-3">
			{#each navItems as item}
				{@const active = isActive(item.href)}
				<a
					href={item.href}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors
					{active
						? 'bg-teal-500/10 text-teal-400'
						: 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}"
				>
					<item.icon class="h-5 w-5" />
					{item.label}
				</a>
			{/each}
		</nav>

		<!-- Bottom section -->
		<div class="absolute bottom-0 left-0 right-0 border-t border-zinc-800 p-3">
			<button
				class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
			>
				<LogOut class="h-5 w-5" />
				Sign out
			</button>
		</div>
	</aside>

	<!-- Backdrop for mobile -->
	{#if sidebarOpen}
		<button
			class="fixed inset-0 z-30 bg-black/50 lg:hidden"
			onclick={() => (sidebarOpen = false)}
		></button>
	{/if}

	<!-- Main content -->
	<main class="flex-1 lg:ml-0">
		<div class="mx-auto max-w-7xl p-6 lg:p-8">
			{@render children()}
		</div>
	</main>
</div>
