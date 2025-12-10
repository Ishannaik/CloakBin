<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		ArrowLeft, Copy, ExternalLink, Clock, HardDrive, Eye,
		Lock, Flame, Flag, AlertTriangle, Trash2,
		CheckCircle, XCircle, Shield, RefreshCw
	} from 'lucide-svelte';

	let { data } = $props();

	// Use server data
	const paste = data.paste;

	let copied = $state(false);
	let showDeleteModal = $state(false);
	let deleting = $state(false);

	function copyId() {
		navigator.clipboard.writeText(paste.id);
		copied = true;
		setTimeout(() => copied = false, 2000);
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleString('en-US', {
			month: 'short', day: 'numeric', year: 'numeric',
			hour: 'numeric', minute: '2-digit', hour12: true
		});
	}

	function formatBytes(bytes: number) {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
	}

	function getTimeUntilExpiry() {
		const diff = new Date(paste.expiresAt).getTime() - Date.now();
		if (diff < 0) return 'Expired';
		const hours = Math.floor(diff / 3600000);
		if (hours > 24) return Math.floor(hours / 24) + 'd ' + (hours % 24) + 'h';
		return hours + 'h ' + Math.floor((diff % 3600000) / 60000) + 'm';
	}
</script>

<svelte:head><title>Paste {paste.id} | CloakBin Admin</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/admin/pastes" class="rounded-lg bg-zinc-800 p-2 hover:bg-zinc-700">
				<ArrowLeft class="h-5 w-5 text-zinc-400" />
			</a>
			<div>
				<h1 class="text-2xl font-semibold text-zinc-100">Paste Details</h1>
				<div class="mt-1 flex items-center gap-2">
					<code class="rounded bg-zinc-800 px-3 py-1 text-lg font-mono text-teal-400">{paste.id}</code>
					<button onclick={copyId} class="rounded p-1.5 hover:bg-zinc-700">
						{#if copied}<CheckCircle class="h-4 w-4 text-green-400" />{:else}<Copy class="h-4 w-4 text-zinc-400" />{/if}
					</button>
				</div>
			</div>
		</div>
		<a href="/p/{paste.id}" target="_blank" class="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500">
			<ExternalLink class="h-4 w-4" /> View Paste
		</a>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<div class="lg:col-span-2 space-y-6">
			<div class="rounded-xl border border-zinc-800 bg-bg-secondary p-5">
				<h2 class="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-400"><Clock class="h-4 w-4" /> Timeline</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					<div><p class="text-xs text-zinc-500">Created</p><p class="mt-1 text-sm text-zinc-200">{formatDate(paste.createdAt)}</p></div>
					<div><p class="text-xs text-zinc-500">Expires</p><p class="mt-1 text-sm text-zinc-200">{formatDate(paste.expiresAt)}</p><p class="text-xs text-teal-400">{getTimeUntilExpiry()} remaining</p></div>
				</div>
			</div>

			<div class="rounded-xl border border-zinc-800 bg-bg-secondary p-5">
				<h2 class="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-400"><HardDrive class="h-4 w-4" /> Stats</h2>
				<div class="rounded-lg bg-zinc-800/50 p-4 text-center">
					<p class="text-3xl font-semibold text-zinc-100">{formatBytes(paste.encryptedSize)}</p>
					<p class="text-sm text-zinc-500">Encrypted Size</p>
				</div>
			</div>

			<div class="rounded-xl border border-zinc-700 bg-zinc-800/30 p-5">
				<h2 class="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300"><Shield class="h-4 w-4 text-teal-400" /> Privacy Notice</h2>
				<div class="space-y-2 text-sm text-zinc-400">
					<div class="flex items-center gap-2"><XCircle class="h-4 w-4 text-zinc-500" /><span>Creator IP: <span class="text-zinc-500">Not stored</span></span></div>
					<div class="flex items-center gap-2"><XCircle class="h-4 w-4 text-zinc-500" /><span>Viewer IPs: <span class="text-zinc-500">Not stored</span></span></div>
					<div class="flex items-center gap-2"><Lock class="h-4 w-4 text-teal-400" /><span>Content: <span class="text-teal-400">Encrypted (cannot decrypt)</span></span></div>
				</div>
			</div>

		</div>

		<div class="space-y-6">
			<div class="rounded-xl border border-zinc-800 bg-bg-secondary p-5">
				<h2 class="mb-4 text-sm font-medium text-zinc-400">Features</h2>
				<div class="space-y-3">
					<div class="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3">
						<div class="flex items-center gap-3"><Lock class="h-5 w-5 {paste.hasPassword ? 'text-amber-400' : 'text-zinc-600'}" /><span class="text-sm text-zinc-300">Password Protected</span></div>
						<span class="rounded px-2 py-0.5 text-xs {paste.hasPassword ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700 text-zinc-500'}">{paste.hasPassword ? 'Yes' : 'No'}</span>
					</div>
					<div class="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3">
						<div class="flex items-center gap-3"><Flame class="h-5 w-5 {paste.burnAfterRead ? 'text-red-400' : 'text-zinc-600'}" /><span class="text-sm text-zinc-300">Burn After Read</span></div>
						<span class="rounded px-2 py-0.5 text-xs {paste.burnAfterRead ? 'bg-red-500/20 text-red-400' : 'bg-zinc-700 text-zinc-500'}">{paste.burnAfterRead ? 'Yes' : 'No'}</span>
					</div>
				</div>
			</div>

			<div class="rounded-xl border border-zinc-800 bg-bg-secondary p-5">
				<h2 class="mb-4 text-sm font-medium text-zinc-400">Actions</h2>
				<div class="space-y-2">
					<a href="/p/{paste.id}" target="_blank" class="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-700 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-600"><Eye class="h-4 w-4" /> View Paste</a>
					<button onclick={() => showDeleteModal = true} class="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/20"><Trash2 class="h-4 w-4" /> Delete</button>
				</div>
			</div>

			<div class="rounded-xl border border-zinc-800 bg-bg-secondary p-5">
				<h2 class="mb-4 text-sm font-medium text-zinc-400">Raw Metadata</h2>
				<div class="space-y-1 text-xs font-mono">
					<div class="flex justify-between"><span class="text-zinc-500">id</span><span class="text-teal-400">{paste.id}</span></div>
					<div class="flex justify-between"><span class="text-zinc-500">created</span><span class="text-zinc-300">{paste.createdAt}</span></div>
					<div class="flex justify-between"><span class="text-zinc-500">expires</span><span class="text-zinc-300">{paste.expiresAt}</span></div>
					<div class="flex justify-between"><span class="text-zinc-500">size</span><span class="text-zinc-300">{paste.encryptedSize} bytes</span></div>
					<div class="flex justify-between"><span class="text-zinc-500">hasPassword</span><span class="text-zinc-300">{paste.hasPassword}</span></div>
					<div class="flex justify-between"><span class="text-zinc-500">burnAfterRead</span><span class="text-zinc-300">{paste.burnAfterRead}</span></div>
				</div>
			</div>
		</div>
	</div>
</div>

{#if showDeleteModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
		<div class="w-full max-w-md rounded-xl border border-zinc-700 bg-bg p-6">
			<h3 class="text-lg font-semibold text-zinc-100">Delete Paste?</h3>
			<p class="mt-2 text-sm text-zinc-400">Permanently delete <code class="text-teal-400">{paste.id}</code>? This cannot be undone.</p>
			<div class="mt-6 flex justify-end gap-3">
				<button onclick={() => showDeleteModal = false} class="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600">Cancel</button>
				<form method="POST" action="?/delete" use:enhance={() => {
					deleting = true;
					return async ({ update }) => {
						await update();
						deleting = false;
					};
				}}>
					<button type="submit" disabled={deleting} class="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50">
						{#if deleting}
							<RefreshCw class="h-4 w-4 animate-spin" /> Deleting...
						{:else}
							Delete
						{/if}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
