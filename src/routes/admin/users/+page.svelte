<script lang="ts">
	import { enhance } from '$app/forms';
	import { UserPlus, Copy, Check, Trash2, Link2, Info } from 'lucide-svelte';

	let { data, form } = $props();
	let copied = $state(false);

	function formatDate(value: Date | string | null): string {
		if (!value) return 'Never';
		return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	}

	async function copyInvite(link: string) {
		await navigator.clipboard.writeText(link);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function confirmDelete(username: string) {
		return ({ cancel }: { cancel: () => void }) => {
			if (
				!confirm(
					`Delete ${username}? They are signed out at once. Their pastes stay until they expire.`
				)
			) {
				cancel();
			}
		};
	}
</script>

<svelte:head><title>Users | CloakBin Admin</title></svelte:head>

<div class="space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-xl font-semibold text-zinc-100 sm:text-2xl">Users</h1>
			<p class="mt-1 text-sm text-zinc-400">
				Members sign in at /login. New members join through an invite link.
			</p>
		</div>
		<form method="POST" action="?/invite" use:enhance>
			<button
				type="submit"
				class="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 sm:w-auto"
			>
				<UserPlus class="h-4 w-4" /> Create invite link
			</button>
		</form>
	</div>

	{#if !data.requiresLogin}
		<div
			class="flex gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-sm text-zinc-300"
		>
			<Info class="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
			<p>
				Anyone can create pastes on this instance right now. To limit paste creation to members, set <code
					class="rounded bg-zinc-900 px-1">CREATE_REQUIRES_LOGIN=true</code
				> and restart.
			</p>
		</div>
	{/if}

	{#if form?.error}
		<p role="alert" class="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{form.error}</p>
	{/if}
	{#if data.loadError}
		<p role="alert" class="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
			Could not load users. Check the database connection.
		</p>
	{/if}

	{#if form?.inviteUrl}
		<div class="rounded-lg border border-teal-500/40 bg-teal-500/5 p-4">
			<p class="text-sm font-medium text-zinc-100">Invite link created</p>
			<p class="mt-1 text-xs text-zinc-400">
				Send it to one person. It works once and expires in {data.inviteDays} days. It is shown only now.
			</p>
			<div class="mt-3 flex flex-col gap-2 sm:flex-row">
				<input
					readonly
					value={form.inviteUrl}
					onfocus={(e) => e.currentTarget.select()}
					class="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-200"
				/>
				<button
					type="button"
					onclick={() => copyInvite(form.inviteUrl)}
					class="flex items-center justify-center gap-2 rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
				>
					{#if copied}<Check class="h-4 w-4" /> Copied{:else}<Copy class="h-4 w-4" /> Copy{/if}
				</button>
			</div>
		</div>
	{/if}

	<section class="rounded-lg border border-zinc-800 bg-bg-secondary">
		<h2 class="border-b border-zinc-800 px-5 py-3 text-sm font-medium text-zinc-200">
			Members ({data.users.length})
		</h2>
		{#if data.users.length === 0}
			<p class="px-5 py-6 text-sm text-zinc-500">
				No members yet. Create an invite link to add the first one.
			</p>
		{:else}
			<ul class="divide-y divide-zinc-800">
				{#each data.users as user (user.id)}
					<li class="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p class="text-sm font-medium text-zinc-100">{user.username}</p>
							<p class="text-xs text-zinc-500">
								Joined {formatDate(user.createdAt)} · Last sign-in {formatDate(user.lastLoginAt)}
							</p>
						</div>
						<form method="POST" action="?/deleteUser" use:enhance={confirmDelete(user.username)}>
							<input type="hidden" name="id" value={user.id} />
							<button
								type="submit"
								class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
							>
								<Trash2 class="h-4 w-4" /> Delete
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="rounded-lg border border-zinc-800 bg-bg-secondary">
		<h2 class="border-b border-zinc-800 px-5 py-3 text-sm font-medium text-zinc-200">
			Open invites ({data.invites.length})
		</h2>
		{#if data.invites.length === 0}
			<p class="px-5 py-6 text-sm text-zinc-500">No unused invites.</p>
		{:else}
			<ul class="divide-y divide-zinc-800">
				{#each data.invites as invite (invite.id)}
					<li class="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
						<p class="flex items-center gap-2 text-sm text-zinc-300">
							<Link2 class="h-4 w-4 text-zinc-500" />
							Created {formatDate(invite.createdAt)}, expires {formatDate(invite.expiresAt)}
						</p>
						<form method="POST" action="?/revokeInvite" use:enhance>
							<input type="hidden" name="id" value={invite.id} />
							<button
								type="submit"
								class="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
							>
								Revoke
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
