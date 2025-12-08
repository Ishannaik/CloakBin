<script lang="ts">
	import {
		LayoutDashboard,
		FileText,
		Users,
		BarChart3,
		Settings,
		LogOut,
		Menu,
		X,
		ExternalLink
	} from 'lucide-svelte';
	import { page } from '$app/stores';
	import logo from '$lib/assets/logo.png?enhanced';

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
	<!-- Mobile menu button (always visible, behind sidebar) -->
	<button
		class="fixed left-4 top-4 z-30 rounded-lg bg-zinc-800 p-2 lg:hidden"
		onclick={() => (sidebarOpen = true)}
	>
		<Menu class="h-5 w-5 text-zinc-300" />
	</button>

	<!-- Sidebar -->
	<aside
		class="fixed inset-y-0 left-0 z-40 w-64 flex flex-col transform border-r border-zinc-800 bg-[#1a1d23] transition-transform lg:relative lg:translate-x-0
		{sidebarOpen ? 'translate-x-0' : '-translate-x-full'}"
	>
		<!-- Logo -->
		<div class="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
			<div class="flex items-center gap-2">
				<enhanced:img src={logo} alt="CloakBin" class="h-7 w-7" />
				<span class="text-lg font-semibold text-zinc-100">CloakBin</span>
				<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">Admin</span>
			</div>
			<div class="flex items-center gap-1">
				<a href="/" class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors" title="Back to Site">
					<ExternalLink class="h-4 w-4" />
				</a>
				<!-- Close button (mobile only) -->
				<button
					class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors lg:hidden"
					onclick={() => (sidebarOpen = false)}
					title="Close menu"
				>
					<X class="h-4 w-4" />
				</button>
			</div>
		</div>

		<!-- Navigation (scrollable if needed) -->
		<nav class="flex-1 overflow-y-auto py-6 space-y-1 px-3">
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

		<!-- Bottom section (always at bottom) -->
		<div class="shrink-0 border-t border-zinc-800 p-3">
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
		<div class="mx-auto max-w-7xl p-4 pt-16 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
			{@render children()}
		</div>
	</main>
</div>
