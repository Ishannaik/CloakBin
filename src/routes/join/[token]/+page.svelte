<script lang="ts">
	import { enhance } from '$app/forms';
	import { UserPlus } from 'lucide-svelte';

	let { data, form } = $props();
	let submitting = $state(false);

	const inputClass =
		'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';
</script>

<svelte:head>
	<title>Create your account | CloakBin</title>
	<meta name="referrer" content="no-referrer" />
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-bg p-4">
	<div class="w-full max-w-sm rounded-xl border border-zinc-800 bg-bg-secondary p-8">
		<div class="mb-6 text-center">
			<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10">
				<UserPlus class="h-6 w-6 text-teal-400" />
			</div>
			<h1 class="text-xl font-semibold text-zinc-100">Create your account</h1>
		</div>

		{#if !data.valid}
			<p class="text-center text-sm text-zinc-400">
				This invite link is invalid, already used, or expired. Ask for a new one.
			</p>
			<a href="/login" class="mt-6 block text-center text-sm text-teal-400 hover:text-teal-300">Go to sign in</a>
		{:else}
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
						minlength="3"
						maxlength="32"
						autocomplete="username"
						autocapitalize="none"
						spellcheck="false"
						value={form?.username ?? ''}
						class={inputClass}
					/>
					<span class="mt-1 block text-xs text-zinc-500">Lowercase letters, numbers, dot, dash or underscore</span>
				</label>
				<label class="block">
					<span class="mb-1.5 block text-sm text-zinc-400">Password</span>
					<input type="password" name="password" required minlength={data.passwordMin} autocomplete="new-password" class={inputClass} />
					<span class="mt-1 block text-xs text-zinc-500">At least {data.passwordMin} characters</span>
				</label>
				<label class="block">
					<span class="mb-1.5 block text-sm text-zinc-400">Confirm password</span>
					<input type="password" name="confirm" required minlength={data.passwordMin} autocomplete="new-password" class={inputClass} />
				</label>
				<button
					type="submit"
					disabled={submitting}
					class="w-full rounded-lg bg-teal-500 px-4 py-2.5 font-medium text-zinc-900 transition-colors hover:bg-teal-400 disabled:opacity-60"
				>
					{submitting ? 'Creating account…' : 'Create account'}
				</button>
			</form>
		{/if}
	</div>
</main>
