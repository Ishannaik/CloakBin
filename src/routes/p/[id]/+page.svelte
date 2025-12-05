<script lang="ts">
	import { page } from '$app/stores';

	// Mock data for now - will come from API + decryption
	let content = $state(`// CloakBin Encrypted Paste
const cloak = require('cloakbin-sdk');

async function encryptAndUpload(data, expiry) {
    const key = await cloak.generateKey();
    const encrypted = await cloak.encrypt(data, key);
    const response = await cloak.upload(encrypted, { expiry: expiry });

    console.log('Paste created successfully.');
    console.log('Share Link:', response.link);
    console.log('Decryption Key:', key); // Keep this secure!
}

// Example usage:
const pasteContent = \`
    This is a highly sensitive configuration file.
    API_KEY=12345abcde
    SECRET_TOKEN=f9e8d7c6b5a4
\`;

encryptAndUpload(pasteContent, '1h');`);

	let copied = $state(false);

	// Calculate line numbers
	let lineCount = $derived(content.split('\n').length);

	function copyToClipboard() {
		navigator.clipboard.writeText(content);
		copied = true;
		setTimeout(() => copied = false, 2000);
	}

	function viewRaw() {
		const blob = new Blob([content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		window.open(url, '_blank');
	}
</script>

<div class="min-h-screen flex flex-col relative">
	<!-- Header -->
	<header class="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
		<a href="/" class="flex items-center gap-3">
			<img src="/logo.png" alt="CloakBin" class="w-8 h-8" />
			<span class="text-xl font-semibold text-teal-400">CloakBin</span>
		</a>
		<div class="flex items-center gap-2">
			<button
				onclick={copyToClipboard}
				class="px-4 py-2 bg-teal-500 text-zinc-900 rounded font-medium hover:bg-teal-400 transition-colors flex items-center gap-2"
			>
				{copied ? '✓ Copied!' : '📋 Copy'}
			</button>
			<button
				onclick={viewRaw}
				class="px-4 py-2 border border-zinc-700 rounded hover:border-zinc-500 transition-colors flex items-center gap-2"
			>
				Raw
			</button>
			<a
				href="/"
				class="px-4 py-2 border border-zinc-700 rounded hover:border-zinc-500 transition-colors flex items-center gap-2"
			>
				+ New
			</a>
		</div>
	</header>

	<!-- Content (read-only) -->
	<div class="flex-1 flex">
		<!-- Line numbers -->
		<div class="w-14 bg-[#1e2228] text-zinc-600 text-right pr-4 py-4 select-none text-sm leading-6 font-mono">
			{#each Array(lineCount) as _, i}
				<div>{i + 1}</div>
			{/each}
		</div>
		<!-- Code display -->
		<pre class="flex-1 py-4 px-2 text-sm leading-6 font-mono overflow-x-auto"><code>{content}</code></pre>
	</div>

	<!-- Bottom bar -->
	<div class="flex items-center justify-center gap-4 py-4 border-t border-zinc-800 text-sm text-zinc-500">
		<span>Created 5 minutes ago</span>
		<span>·</span>
		<span>Expires in 55 minutes</span>
	</div>

	<!-- Footer badge -->
	<div class="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-zinc-500">
		<span>🔒</span>
		<span>End-to-end encrypted</span>
	</div>
</div>
