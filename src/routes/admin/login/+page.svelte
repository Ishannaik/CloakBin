<script lang="ts">
	import { enhance } from '$app/forms';
	import { Lock } from 'lucide-svelte';

	let { form } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-bg p-4">
	<div class="w-full max-w-sm">
		<div class="rounded-xl border border-zinc-800 bg-bg-secondary p-8">
			<!-- Header -->
			<div class="mb-6 text-center">
				<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10">
					<Lock class="h-6 w-6 text-teal-400" />
				</div>
				<h1 class="text-xl font-semibold text-zinc-100">Admin Login</h1>
				<p class="mt-1 text-sm text-zinc-500">Enter your credentials to continue</p>
			</div>

			<!-- Error Message -->
			{#if form?.error}
				<div class="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
					{form.error}
				</div>
			{/if}

			<!-- Login Form -->
			<form method="POST" use:enhance class="space-y-4">
				<div>
					<label for="username" class="mb-1.5 block text-sm text-zinc-400">Username</label>
					<input
						type="text"
						id="username"
						name="username"
						required
						autocomplete="username"
						class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
						placeholder="admin"
					/>
				</div>

				<div>
					<label for="password" class="mb-1.5 block text-sm text-zinc-400">Password</label>
					<input
						type="password"
						id="password"
						name="password"
						required
						autocomplete="current-password"
						class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
						placeholder="••••••••"
					/>
				</div>

				<button
					type="submit"
					class="w-full rounded-lg bg-teal-500 px-4 py-2.5 font-medium text-zinc-900 transition-colors hover:bg-teal-400"
				>
					Sign in
				</button>
			</form>

			<!-- Back link -->
			<div class="mt-6 text-center">
				<a href="/" class="text-sm text-zinc-500 hover:text-zinc-300">
					&larr; Back to CloakBin
				</a>
			</div>
		</div>
	</div>
</div>
