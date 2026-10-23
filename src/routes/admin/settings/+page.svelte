<script lang="ts">
	import { RefreshCw, AlertTriangle, Database, Shield, Trash2 } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { data } = $props();

	let clearing = $state(false);
	let clearResult = $state<{ success: boolean; deleted?: number; error?: string } | null>(null);

	function formatBytes(bytes: number): string {
		if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MiB`;
		if (bytes >= 1024) return `${(bytes / 1024).toFixed(1).replace(/\.0$/, '')} KiB`;
		return `${bytes} bytes`;
	}
</script>

<svelte:head><title>Settings | CloakBin Admin</title></svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-xl font-semibold text-zinc-100 sm:text-2xl">Settings</h1>
		<p class="mt-1 text-sm text-zinc-400">
			These come from environment variables. Change them in your <code class="rounded bg-zinc-800 px-1">.env</code>
			or Compose file, then restart CloakBin.
		</p>
	</div>

	<!-- Instance settings (read-only) -->
	<div class="rounded-lg border border-zinc-800 bg-bg-secondary p-5">
		<div class="mb-4 flex items-center gap-2">
			<Shield class="h-5 w-5 text-teal-400" />
			<h2 class="text-lg font-medium text-zinc-200">Instance</h2>
		</div>
		<div class="space-y-3">
			<div class="flex flex-col gap-1 rounded-lg bg-zinc-800/50 p-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p class="text-sm font-medium text-zinc-200">Who can create pastes</p>
					<p class="text-xs text-zinc-500">
						<code>CREATE_REQUIRES_LOGIN</code>. Reading a paste by link is always open.
						{#if data.settings.createRequiresLogin}Manage members on the <a href="/admin/users" class="text-teal-400 hover:text-teal-300">Users</a> page.{/if}
					</p>
				</div>
				<p class="text-sm font-medium {data.settings.createRequiresLogin ? 'text-teal-400' : 'text-zinc-300'}">
					{data.settings.createRequiresLogin ? 'Signed-in members only' : 'Anyone'}
				</p>
			</div>
			<div class="flex flex-col gap-1 rounded-lg bg-zinc-800/50 p-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p class="text-sm font-medium text-zinc-200">Max paste size</p>
					<p class="text-xs text-zinc-500"><code>MAX_PASTE_BYTES</code>, measured on the encrypted text</p>
				</div>
				<p class="text-sm font-medium text-zinc-300">{formatBytes(data.settings.maxPasteBytes)}</p>
			</div>
		</div>
	</div>

	<!-- System Status -->
	<div class="rounded-lg border border-zinc-800 bg-bg-secondary p-5">
		<div class="mb-4 flex items-center gap-2">
			<Database class="h-5 w-5 text-teal-400" />
			<h2 class="text-lg font-medium text-zinc-200">System Status</h2>
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="rounded-lg bg-zinc-800/50 p-4">
				<div class="flex items-center gap-2">
					<div class="h-2 w-2 rounded-full {data.dbConnected ? 'bg-emerald-400' : 'bg-red-400'}"></div>
					<span class="text-sm text-zinc-400">Database</span>
				</div>
				<p class="mt-1 text-sm font-medium text-zinc-200">{data.dbConnected ? 'Connected' : 'Disconnected'}</p>
			</div>
			<div class="rounded-lg bg-zinc-800/50 p-4">
				<div class="flex items-center gap-2">
					<div class="h-2 w-2 rounded-full bg-teal-400"></div>
					<span class="text-sm text-zinc-400">Storage Backend</span>
				</div>
				<p class="mt-1 text-sm font-medium text-zinc-200">{data.storageInfo}</p>
			</div>
		</div>
	</div>

	<!-- Danger Zone -->
	<div class="rounded-lg border border-red-500/30 bg-red-500/5 p-5">
		<div class="mb-4 flex items-center gap-2">
			<AlertTriangle class="h-5 w-5 text-red-400" />
			<h2 class="text-lg font-medium text-red-400">Danger Zone</h2>
		</div>
		<div class="space-y-3">
			<div class="flex flex-col gap-3 rounded-lg bg-zinc-800/50 p-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p class="text-sm font-medium text-zinc-200">Clear Expired Pastes</p>
					<p class="text-xs text-zinc-500">Remove all expired pastes from database</p>
					{#if clearResult}
						<p class="mt-1 text-xs {clearResult.success ? 'text-emerald-400' : 'text-red-400'}">
							{clearResult.success ? `Deleted ${clearResult.deleted} expired pastes` : clearResult.error}
						</p>
					{/if}
				</div>
				<form method="POST" action="?/clearExpired" use:enhance={() => {
					clearing = true;
					clearResult = null;
					return async ({ result }) => {
						clearing = false;
						if (result.type === 'success' && result.data) {
							clearResult = result.data as { success: boolean; deleted?: number; error?: string };
						}
					};
				}}>
					<button type="submit" disabled={clearing}
						class="flex items-center gap-2 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50">
						{#if clearing}
							<RefreshCw class="h-4 w-4 animate-spin" /> Clearing...
						{:else}
							<Trash2 class="h-4 w-4" /> Clear Expired
						{/if}
					</button>
				</form>
			</div>
		</div>
	</div>
</div>
