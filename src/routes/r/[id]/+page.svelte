<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { decrypt, base64ToKey } from '$lib/crypto';

	let content = $state('');
	let viewState = $state<'loading' | 'error' | 'success' | 'needKey'>('loading');
	let errorMessage = $state('');

	onMount(async () => {
		try {
			const pasteId = $page.params.id;
			const response = await fetch(`/api/paste/${pasteId}`);

			if (!response.ok) {
				const errorData = await response.json();
				viewState = 'error';
				errorMessage = response.status === 404
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
			viewState = 'success';
		} catch (error) {
			console.error('Error loading paste:', error);
			viewState = 'error';
			errorMessage = 'Failed to decrypt. Invalid key?';
		}
	});
</script>

<svelte:head>
	<title>Raw Paste | CloakBin</title>
</svelte:head>

{#if viewState === 'loading'}
	<pre class="raw-content">Loading...</pre>
{:else if viewState === 'error' || viewState === 'needKey'}
	<pre class="raw-content">Error: {errorMessage}</pre>
{:else}
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
</style>
