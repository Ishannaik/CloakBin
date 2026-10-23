<script lang="ts">
	import { enhance } from '$app/forms';
	import { Lock } from 'lucide-svelte';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head><title>Sign in | CloakBin</title></svelte:head>

<main class="flex min-h-screen items-center justify-center bg-bg p-4">
	<div class="w-full max-w-sm rounded-xl border border-zinc-800 bg-bg-secondary p-8">
		<div class="mb-6 text-center">
			<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10">
				<Lock class="h-6 w-6 text-teal-400" />
			</div>
			<h1 class="text-xl font-semibold text-zinc-100">Sign in to CloakBin</h1>
			{#if data.requiresLogin}
				<p class="mt-2 text-sm text-zinc-400">
					Only members can create pastes here. Anyone with a link can still read a paste.
				</p>
			{/if}
		</div>

		{#if form?.error}
			<p role="alert" class="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{form.error}</p>
		{/if}

		<form
			method="POST"
			class="space-y-4"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<label class="block">
				<span class="mb-1.5 block text-sm text-zinc-400">Username</span>
				<input
					name="username"
					required
					autocomplete="username"
					autocapitalize="none"
					spellcheck="false"
					value={form?.username ?? ''}
					class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
				/>
			</label>
			<label class="block">
				<span class="mb-1.5 block text-sm text-zinc-400">Password</span>
				<input
					type="password"
					name="password"
					required
					autocomplete="current-password"
					class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
				/>
			</label>
			<button
				type="submit"
				disabled={submitting}
				class="w-full rounded-lg bg-teal-500 px-4 py-2.5 font-medium text-zinc-900 transition-colors hover:bg-teal-400 disabled:opacity-60"
			>
				{submitting ? 'Signing in…' : 'Sign in'}
			</button>
		</form>

		<p class="mt-6 text-center text-sm text-zinc-500">
			No account? Ask the person who runs this instance for an invite link.
		</p>
	</div>
</main>
