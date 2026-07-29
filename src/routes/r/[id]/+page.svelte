<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { decrypt, base64ToKey } from '$lib/crypto';

	let content = $state('');
	let viewState = $state<'loading' | 'error' | 'success' | 'needKey'>('loading');
	let errorMessage = $state('');
	let fullViewHref = $state('');

	onMount(async () => {
		try {
			const pasteId = $page.params.id;
			const response = await fetch(`/api/paste/${pasteId}`);

			if (!response.ok) {
				const errorData = await response.json();
				viewState = 'error';
				errorMessage =
					response.status === 404
						? 'Paste not found or expired'
						: errorData.error || 'Failed to fetch paste';
				return;
			}

			const data = await response.json();
			const urlHash = window.location.hash.slice(1);

			if (!urlHash) {
				viewState = 'needKey';
				errorMessage = 'Decryption key required in URL fragment';
				return;
			}

			const key = await base64ToKey(urlHash);
			const decryptedContent = await decrypt(data.content, key);
			content = decryptedContent;
			fullViewHref = `/p/${pasteId}${window.location.hash}`;
			viewState = 'success';
		} catch (error) {
			console.error('Error loading paste:', error);
			viewState = 'error';
			errorMessage = 'Failed to decrypt. Invalid key?';
		}
	});

	function editAsNew() {
		sessionStorage.setItem('cloakbin_duplicate', content);
		goto('/');
	}
</script>

<svelte:head>
	<title>Raw Paste | CloakBin</title>
</svelte:head>

{#if viewState === 'loading'}
	<pre class="raw-content">Loading...</pre>
{:else if viewState === 'error' || viewState === 'needKey'}
	<pre class="raw-content">Error: {errorMessage}</pre>
{:else}
	<div class="raw-actions">
		<a href={fullViewHref}>Full view</a>
		<button type="button" onclick={editAsNew}>Edit as new</button>
	</div>
	<pre class="raw-content">{content}</pre>
{/if}

<style>
	:global(body) {
		background: #1a1d23;
		margin: 0;
		padding: 0;
	}

	.raw-content {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 14px;
		line-height: 1.5;
		color: #e4e4e7;
		background: #1a1d23;
		margin: 0;
		padding: 16px;
		white-space: pre-wrap;
		word-wrap: break-word;
		min-height: 100vh;
		box-sizing: border-box;
	}

	.raw-actions {
		display: flex;
		gap: 12px;
		align-items: center;
		padding: 12px 16px;
		background: #111318;
		border-bottom: 1px solid #2f333d;
		font-family: system-ui, sans-serif;
	}

	.raw-actions a,
	.raw-actions button {
		color: #5eead4;
		background: transparent;
		border: 0;
		padding: 0;
		font: inherit;
		text-decoration: none;
		cursor: pointer;
	}

	.raw-actions a:hover,
	.raw-actions button:hover {
		color: #99f6e4;
		text-decoration: underline;
	}
</style>
