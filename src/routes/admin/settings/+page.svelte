<script lang="ts">
	import { Save, RefreshCw, AlertTriangle, Check, Database, Shield, Clock, HardDrive } from 'lucide-svelte';

	let settings = $state({
		maxPasteSize: 500,
		maxPastesPerHour: 10,
		defaultExpiry: '24h',
		allowAnonymous: true,
		requireCaptcha: false,
		enableBurnAfterRead: true,
		enablePasswordProtection: true,
		premiumMaxSize: 10000,
		inactiveDeleteDays: 90,
	});

	let saving = $state(false);
	let saved = $state(false);

	async function saveSettings() {
		saving = true;
		await new Promise(r => setTimeout(r, 1000));
		saving = false;
		saved = true;
		setTimeout(() => saved = false, 3000);
	}

	const expiryOptions = ['1h', '24h', '7d', '30d', '1y', 'never'];
</script>

<svelte:head><title>Settings | CloakBin Admin</title></svelte:head>

<div class="space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-xl font-semibold text-zinc-100 sm:text-2xl">Settings</h1>
			<p class="mt-1 text-sm text-zinc-400">Configure your CloakBin instance</p>
		</div>
		<button onclick={saveSettings} disabled={saving}
			class="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50 sm:w-auto">
			{#if saving}
				<RefreshCw class="h-4 w-4 animate-spin" /> Saving...
			{:else if saved}
				<Check class="h-4 w-4" /> Saved!
			{:else}
				<Save class="h-4 w-4" /> Save Changes
			{/if}
		</button>
	</div>

	<!-- Paste Limits -->
	<div class="rounded-lg border border-zinc-800 bg-[#242830] p-5">
		<div class="mb-4 flex items-center gap-2">
			<HardDrive class="h-5 w-5 text-teal-400" />
			<h2 class="text-lg font-medium text-zinc-200">Paste Limits</h2>
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label class="mb-1.5 block text-sm text-zinc-400">Max Paste Size (KB)</label>
				<input type="number" bind:value={settings.maxPasteSize}
					class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-teal-500 focus:outline-none" />
			</div>
			<div>
				<label class="mb-1.5 block text-sm text-zinc-400">Premium Max Size (KB)</label>
				<input type="number" bind:value={settings.premiumMaxSize}
					class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-teal-500 focus:outline-none" />
			</div>
			<div>
				<label class="mb-1.5 block text-sm text-zinc-400">Rate Limit (pastes/hour)</label>
				<input type="number" bind:value={settings.maxPastesPerHour}
					class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-teal-500 focus:outline-none" />
			</div>
			<div>
				<label class="mb-1.5 block text-sm text-zinc-400">Inactive Delete (days)</label>
				<input type="number" bind:value={settings.inactiveDeleteDays}
					class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-teal-500 focus:outline-none" />
			</div>
		</div>
	</div>

	<!-- Expiry Settings -->
	<div class="rounded-lg border border-zinc-800 bg-[#242830] p-5">
		<div class="mb-4 flex items-center gap-2">
			<Clock class="h-5 w-5 text-teal-400" />
			<h2 class="text-lg font-medium text-zinc-200">Expiry Settings</h2>
		</div>
		<div>
			<label class="mb-1.5 block text-sm text-zinc-400">Default Expiry</label>
			<select bind:value={settings.defaultExpiry}
				class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-teal-500 focus:outline-none sm:w-48">
				{#each expiryOptions as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Feature Toggles -->
	<div class="rounded-lg border border-zinc-800 bg-[#242830] p-5">
		<div class="mb-4 flex items-center gap-2">
			<Shield class="h-5 w-5 text-teal-400" />
			<h2 class="text-lg font-medium text-zinc-200">Features</h2>
		</div>
		<div class="space-y-4">
			<label class="flex cursor-pointer items-center justify-between rounded-lg bg-zinc-800/50 p-4">
				<div>
					<p class="text-sm font-medium text-zinc-200">Allow Anonymous Pastes</p>
					<p class="text-xs text-zinc-500">Users can create pastes without logging in</p>
				</div>
				<input type="checkbox" bind:checked={settings.allowAnonymous}
					class="h-5 w-5 rounded border-zinc-600 bg-zinc-700 text-teal-500 focus:ring-teal-500" />
			</label>
			<label class="flex cursor-pointer items-center justify-between rounded-lg bg-zinc-800/50 p-4">
				<div>
					<p class="text-sm font-medium text-zinc-200">Enable Burn After Read</p>
					<p class="text-xs text-zinc-500">Allow pastes to be deleted after first view</p>
				</div>
				<input type="checkbox" bind:checked={settings.enableBurnAfterRead}
					class="h-5 w-5 rounded border-zinc-600 bg-zinc-700 text-teal-500 focus:ring-teal-500" />
			</label>
			<label class="flex cursor-pointer items-center justify-between rounded-lg bg-zinc-800/50 p-4">
				<div>
					<p class="text-sm font-medium text-zinc-200">Enable Password Protection</p>
					<p class="text-xs text-zinc-500">Allow users to password protect pastes</p>
				</div>
				<input type="checkbox" bind:checked={settings.enablePasswordProtection}
					class="h-5 w-5 rounded border-zinc-600 bg-zinc-700 text-teal-500 focus:ring-teal-500" />
			</label>
		</div>
	</div>

	<!-- System Status -->
	<div class="rounded-lg border border-zinc-800 bg-[#242830] p-5">
		<div class="mb-4 flex items-center gap-2">
			<Database class="h-5 w-5 text-teal-400" />
			<h2 class="text-lg font-medium text-zinc-200">System Status</h2>
		</div>
		<div class="grid gap-4 sm:grid-cols-3">
			<div class="rounded-lg bg-zinc-800/50 p-4">
				<div class="flex items-center gap-2">
					<div class="h-2 w-2 rounded-full bg-emerald-400"></div>
					<span class="text-sm text-zinc-400">Database</span>
				</div>
				<p class="mt-1 text-sm font-medium text-zinc-200">Connected</p>
			</div>
			<div class="rounded-lg bg-zinc-800/50 p-4">
				<div class="flex items-center gap-2">
					<div class="h-2 w-2 rounded-full bg-emerald-400"></div>
					<span class="text-sm text-zinc-400">Redis Cache</span>
				</div>
				<p class="mt-1 text-sm font-medium text-zinc-200">Connected</p>
			</div>
			<div class="rounded-lg bg-zinc-800/50 p-4">
				<div class="flex items-center gap-2">
					<div class="h-2 w-2 rounded-full bg-amber-400"></div>
					<span class="text-sm text-zinc-400">Stripe</span>
				</div>
				<p class="mt-1 text-sm font-medium text-zinc-200">Not Configured</p>
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
				</div>
				<button class="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700">
					Clear Expired
				</button>
			</div>
		</div>
	</div>
</div>
