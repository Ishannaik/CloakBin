<script lang="ts">
	import { page } from '$app/stores';
	import { goto, beforeNavigate, afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { decrypt, base64ToKey, deriveKeyFromPassword } from '$lib/crypto';
	import CodeMirror from 'svelte-codemirror-editor';
	import { javascript } from '@codemirror/lang-javascript';
	import { oneDark } from '@codemirror/theme-one-dark';
	import type { Extension } from '@codemirror/state';
	import {
		dracula,
		cobalt,
		coolGlow,
		amy,
		bespin,
		espresso,
		noctisLilac
	} from 'thememirror';
	import { EditorView } from '@codemirror/view';
	import logo from '$lib/assets/logo.svg';
	import { Lock, Copy, Plus, Check, Files, Share2, Key, Flame, Settings } from 'lucide-svelte';
	import ShortcutsModal from '$lib/components/ShortcutsModal.svelte';

	// OS detection for keyboard shortcut display
	const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
	const mod = isMac ? '⌘' : 'Ctrl';

	// State management
	let content = $state('');
	let showShortcuts = $state(false);
	let viewState = $state<'loading' | 'error' | 'success' | 'needKey' | 'needPassword' | 'burnWarning'>('loading');
	let errorMessage = $state('');
	let createdAt = $state<Date | null>(null);
	let expiresAt = $state<Date | null>(null);
	let copied = $state(false);
	let shareCopied = $state(false);
	let manualKey = $state('');
	let encryptedContent = $state(''); // Store encrypted content for manual key entry
	let pasteMetadata = $state<{ createdAt: string; expiresAt: string } | null>(null);
	let passwordInput = $state('');
	let showBurnWarning = $state(false);
	let pasteData = $state<{ content: string; hasPassword: boolean; salt?: string; burnAfterRead: boolean; createdAt: string; expiresAt: string; language?: string } | null>(null);
	let detectedLanguage = $state('javascript');
	let languageExtension = $state<Extension>(javascript());

	// Theme state
	let selectedTheme = $state('oneDark');
	let showSettings = $state(false);

	const themes = {
		oneDark: { name: 'One Dark', theme: oneDark },
		dracula: { name: 'Dracula', theme: dracula },
		cobalt: { name: 'Cobalt', theme: cobalt },
		coolGlow: { name: 'Cool Glow', theme: coolGlow },
		amy: { name: 'Amy', theme: amy },
		bespin: { name: 'Bespin', theme: bespin },
		espresso: { name: 'Espresso', theme: espresso },
		noctisLilac: { name: 'Noctis Lilac', theme: noctisLilac }
	};

	const currentTheme = $derived(themes[selectedTheme as keyof typeof themes].theme);

	// Persist theme to localStorage when it changes
	$effect(() => {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('cloakbin_theme', selectedTheme);
		}
	});

	// Load language extension dynamically
	async function loadLanguageExtension(lang: string): Promise<Extension> {
		try {
			switch (lang) {
				case 'javascript':
				case 'js':
					return (await import('@codemirror/lang-javascript')).javascript();
				case 'typescript':
				case 'ts':
					return (await import('@codemirror/lang-javascript')).javascript({ typescript: true });
				case 'python':
				case 'py':
					return (await import('@codemirror/lang-python')).python();
				case 'json':
					return (await import('@codemirror/lang-json')).json();
				case 'html':
				case 'xml':
					return (await import('@codemirror/lang-html')).html();
				case 'css':
					return (await import('@codemirror/lang-css')).css();
				case 'markdown':
				case 'md':
					return (await import('@codemirror/lang-markdown')).markdown();
				case 'sql':
					return (await import('@codemirror/lang-sql')).sql();
				case 'java':
					return (await import('@codemirror/lang-java')).java();
				case 'cpp':
				case 'c':
					return (await import('@codemirror/lang-cpp')).cpp();
				case 'rust':
				case 'rs':
					return (await import('@codemirror/lang-rust')).rust();
				case 'go':
					return (await import('@codemirror/lang-go')).go();
				case 'php':
					return (await import('@codemirror/lang-php')).php();
				default:
					// Fallback to javascript for unknown languages
					return javascript();
			}
		} catch {
			// If dynamic import fails, fallback to javascript
			return javascript();
		}
	}

	// Format relative time
	function formatRelativeTime(date: Date): string {
		const now = new Date();
		const diffMs = date.getTime() - now.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 0) return 'Expired';
		if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
		if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
		return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
	}

	// Format time ago
	function formatTimeAgo(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
		if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
		return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
	}

	// Derived values for display
	let createdTimeAgo = $derived(createdAt ? formatTimeAgo(createdAt) : '');
	let expiresIn = $derived(expiresAt ? formatRelativeTime(expiresAt) : '');

	// Copy content to clipboard
	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(content);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
		}
	}

	// Copy share URL to clipboard
	async function copyShareUrl() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			shareCopied = true;
			setTimeout(() => {
				shareCopied = false;
			}, 2000);
		} catch (error) {
			console.error('Failed to copy share URL:', error);
		}
	}

	// Duplicate paste - navigate to home with content pre-filled
	function duplicatePaste() {
		sessionStorage.setItem('cloakbin_duplicate', content);
		goto('/');
	}

	// Decrypt with manual key
	async function decryptWithManualKey() {
		if (!manualKey.trim() || !encryptedContent) return;

		try {
			const key = await base64ToKey(manualKey.trim());
			const decryptedContent = await decrypt(encryptedContent, key);
			content = decryptedContent;

			if (pasteMetadata) {
				createdAt = new Date(pasteMetadata.createdAt);
				expiresAt = new Date(pasteMetadata.expiresAt);
			}

			// Update URL with the key
			window.history.replaceState(null, '', `${window.location.pathname}#${manualKey.trim()}`);
			viewState = 'success';
		} catch (error) {
			console.error('Decryption failed:', error);
			errorMessage = 'Failed to decrypt. Invalid key?';
			viewState = 'error';
		}
	}

	// Decrypt with password
	async function decryptWithPassword() {
		if (!passwordInput.trim() || !pasteData) return;
		try {
			const key = await deriveKeyFromPassword(passwordInput, pasteData.salt!);
			const decryptedContent = await decrypt(pasteData.content, key);
			content = decryptedContent;
			createdAt = new Date(pasteData.createdAt);
			expiresAt = new Date(pasteData.expiresAt);
			viewState = 'success';
		} catch (e) {
			errorMessage = 'Wrong password or decryption failed';
		}
	}

	// Confirm burn and view
	async function confirmBurnAndView() {
		showBurnWarning = false;
		if (!pasteData) return;

		try {
			// Get encryption key from URL hash
			const urlHash = window.location.hash.slice(1);
			if (!urlHash) {
				viewState = 'needKey';
				return;
			}

			const key = await base64ToKey(urlHash);
			const decryptedContent = await decrypt(pasteData.content, key);
			content = decryptedContent;
			createdAt = new Date(pasteData.createdAt);
			expiresAt = new Date(pasteData.expiresAt);
			viewState = 'success';

			// Delete the paste after viewing
			const pasteId = $page.params.id;
			await fetch(`/api/paste/${pasteId}`, { method: 'DELETE' });
		} catch (error) {
			console.error('Decryption failed:', error);
			viewState = 'error';
			errorMessage = 'Failed to decrypt. Invalid key?';
		}
	}

	// Select all content in the editor using native DOM Selection API
	function selectAllContent() {
		const contentEl = document.querySelector('.cm-content');
		if (contentEl) {
			const range = document.createRange();
			range.selectNodeContents(contentEl);
			const selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
		}
	}

	// Open raw view
	function openRawView() {
		const pasteId = $page.params.id;
		const urlHash = window.location.hash;
		window.location.href = `/r/${pasteId}${urlHash}`;
	}

	// Global keyboard shortcuts handler
	function handleKeydown(e: KeyboardEvent) {
		// Show shortcuts modal on ? or Ctrl+/
		if (e.key === '?' || ((e.ctrlKey || e.metaKey) && e.key === '/')) {
			e.preventDefault();
			showShortcuts = !showShortcuts;
			return;
		}

		// Only handle other shortcuts when viewing successfully
		if (viewState !== 'success') return;

		const isMod = e.ctrlKey || e.metaKey;

		// Ctrl+A - Always select only the code content
		if (isMod && e.key.toLowerCase() === 'a' && !(e.target instanceof HTMLInputElement)) {
			e.preventDefault();
			selectAllContent();
			return;
		}

		// Ctrl+Shift+R - Open raw view
		if (isMod && e.shiftKey && e.key.toLowerCase() === 'r') {
			e.preventDefault();
			openRawView();
			return;
		}

		// Ctrl+D - Duplicate paste
		if (isMod && e.key.toLowerCase() === 'd') {
			e.preventDefault();
			duplicatePaste();
			return;
		}

		// Ctrl+S - Copy share URL
		if (isMod && e.key.toLowerCase() === 's') {
			e.preventDefault();
			copyShareUrl();
			return;
		}
	}

	// Fetch and decrypt paste
	async function loadAndDecrypt() {
		viewState = 'loading';
		content = '';

		try {
			// Get paste ID from route params
			const pasteId = $page.params.id;

			// Fetch encrypted paste from API
			const response = await fetch(`/api/paste/${pasteId}`);

			if (!response.ok) {
				const errorData = await response.json();
				viewState = 'error';

				if (response.status === 404) {
					errorMessage = 'Paste not found or expired';
				} else {
					errorMessage = errorData.error || 'Failed to fetch paste';
				}
				return;
			}

			const data = await response.json();

			// Store paste data for password/burn handling
			pasteData = {
				content: data.content,
				hasPassword: data.hasPassword || false,
				salt: data.salt,
				burnAfterRead: data.burnAfterRead || false,
				createdAt: data.createdAt,
				expiresAt: data.expiresAt,
				language: data.language || 'plaintext'
			};

			// Load language extension for syntax highlighting
			detectedLanguage = data.language || 'plaintext';
			languageExtension = await loadLanguageExtension(detectedLanguage);

			// Store encrypted content and metadata for potential manual key entry
			encryptedContent = data.content;
			pasteMetadata = { createdAt: data.createdAt, expiresAt: data.expiresAt };

			// If password-protected, show password prompt
			if (pasteData.hasPassword) {
				viewState = 'needPassword';
				return;
			}

			// If burn after read, show warning
			if (pasteData.burnAfterRead) {
				viewState = 'burnWarning';
				return;
			}

			// Get encryption key from URL hash
			const urlHash = window.location.hash.slice(1); // Remove '#'

			if (!urlHash) {
				// No key in URL - ask user to enter it
				viewState = 'needKey';
				return;
			}

			// Convert base64 key to CryptoKey
			const key = await base64ToKey(urlHash);

			// Decrypt content
			try {
				const decryptedContent = await decrypt(data.content, key);
				content = decryptedContent;
				createdAt = new Date(data.createdAt);
				expiresAt = new Date(data.expiresAt);
				viewState = 'success';
			} catch (error) {
				console.error('Decryption failed:', error);
				viewState = 'error';
				errorMessage = 'Failed to decrypt. Invalid key?';
			}
		} catch (error) {
			console.error('Error loading paste:', error);
			viewState = 'error';
			errorMessage = 'Failed to load paste';
		}
	}

	// Clear content when navigating away (SvelteKit client-side navigation)
	beforeNavigate(() => {
		content = '';
		viewState = 'loading';
	});

	// Re-decrypt when navigating back to this page
	afterNavigate(({ type }) => {
		if (type === 'popstate') {
			// Came back via back/forward button - re-decrypt
			loadAndDecrypt();
		}
	});

	// Handle bfcache (back-forward cache) security
	// Without this, pressing back then forward shows decrypted content from memory
	onMount(() => {
		// Restore theme from localStorage
		const savedTheme = localStorage.getItem('cloakbin_theme');
		if (savedTheme && savedTheme in themes) {
			selectedTheme = savedTheme;
		}

		// Clear sensitive content when navigating away (browser navigation)
		const handlePageHide = () => {
			content = '';
			viewState = 'loading';
		};

		// Re-decrypt if page restored from bfcache
		const handlePageShow = (e: PageTransitionEvent) => {
			if (e.persisted) {
				loadAndDecrypt();
			}
		};

		// Close settings dropdown when clicking outside
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest('.settings-dropdown')) {
				showSettings = false;
			}
		};

		window.addEventListener('pagehide', handlePageHide);
		window.addEventListener('pageshow', handlePageShow);
		document.addEventListener('click', handleClickOutside);

		// Initial load
		loadAndDecrypt();

		return () => {
			window.removeEventListener('pagehide', handlePageHide);
			window.removeEventListener('pageshow', handlePageShow);
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<svelte:head>
	<title>Encrypted Paste | CloakBin</title>
	<meta name="description" content="View this encrypted paste on CloakBin. End-to-end encrypted, zero-knowledge pastebin." />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Encrypted Paste | CloakBin" />
	<meta property="og:description" content="View this encrypted paste on CloakBin. Your content is secure with end-to-end encryption." />
	<meta property="og:image" content="/og-image-logo.png" />
	<meta property="og:site_name" content="CloakBin" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Encrypted Paste | CloakBin" />
	<meta name="twitter:description" content="View this encrypted paste on CloakBin. Your content is secure with end-to-end encryption." />
	<meta name="twitter:image" content="/og-image-logo.png" />

	<!-- Security: prevent robots from indexing paste pages -->
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="h-screen flex flex-col relative overflow-hidden">
	<!-- Header -->
	<header class="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
		<a href="/" class="flex items-center gap-3 group cursor-pointer">
			<img
				src={logo}
				alt="CloakBin"
				class="w-8 h-8 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3"
			/>
			<span class="text-xl font-semibold text-teal-400 transition-colors duration-200 group-hover:text-teal-300">CloakBin</span>
		</a>

		{#if viewState === 'success'}
			<div class="flex items-center gap-1 sm:gap-2">
				<button
					onclick={copyToClipboard}
					class="p-2 sm:px-4 sm:py-2 rounded font-medium transition-all duration-150 flex items-center gap-2 {copied ? 'bg-green-500 hover:bg-green-400' : 'bg-zinc-700 hover:bg-zinc-600'} text-zinc-100 active:scale-95"
				>
					{#if copied}
						<Check size={16} />
						<span class="hidden sm:inline">Copied!</span>
					{:else}
						<Copy size={16} />
						<span class="hidden sm:inline">Copy</span>
					{/if}
				</button>
				<button
					onclick={duplicatePaste}
					title="{mod}+D"
					class="p-2 sm:px-4 sm:py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded font-medium transition-all duration-150 active:scale-95 flex items-center gap-2"
				>
					<Files size={16} />
					<span class="hidden sm:inline">Duplicate</span>
				</button>
				<button
					onclick={copyShareUrl}
					title="{mod}+S"
					class="p-2 sm:px-4 sm:py-2 rounded font-medium transition-all duration-150 flex items-center gap-2 {shareCopied ? 'bg-green-500 hover:bg-green-400' : 'bg-zinc-700 hover:bg-zinc-600'} text-zinc-100 active:scale-95"
				>
					{#if shareCopied}
						<Check size={16} />
						<span class="hidden sm:inline">Link Copied!</span>
					{:else}
						<Share2 size={16} />
						<span class="hidden sm:inline">Share</span>
					{/if}
				</button>
				<a
					href="/"
					class="p-2 sm:px-4 sm:py-2 bg-teal-500 text-zinc-900 rounded font-medium transition-all duration-150 hover:bg-teal-400 active:scale-95 flex items-center gap-2"
				>
					<Plus size={16} />
					<span class="hidden sm:inline">New</span>
				</a>
				<!-- Settings dropdown -->
				<div class="relative settings-dropdown">
					<button
						onclick={() => showSettings = !showSettings}
						class="p-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded font-medium transition-all duration-150 active:scale-95"
						title="Settings"
					>
						<Settings size={16} />
					</button>
					{#if showSettings}
						<div class="absolute right-0 top-full mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 animate-fade-in">
							<div class="p-3 border-b border-zinc-700">
								<span class="text-xs text-zinc-500 uppercase tracking-wide">Theme</span>
							</div>
							<div class="p-2 max-h-64 overflow-y-auto">
								{#each Object.entries(themes) as [key, { name }]}
									<button
										onclick={() => { selectedTheme = key; showSettings = false; }}
										class="w-full text-left px-3 py-2 rounded text-sm transition-colors duration-150 {selectedTheme === key ? 'bg-teal-500/20 text-teal-400' : 'hover:bg-zinc-700 text-zinc-300'}"
									>
										{name}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</header>

	<!-- Loading State -->
	{#if viewState === 'loading'}
		<div class="flex-1 flex items-center justify-center">
			<div class="flex flex-col items-center gap-4 animate-fade-in">
				<div class="w-12 h-12 border-3 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"></div>
				<p class="text-zinc-400 text-sm">Loading paste...</p>
			</div>
		</div>
	{/if}

	<!-- Error State -->
	{#if viewState === 'error'}
		<div class="flex-1 flex items-center justify-center">
			<div class="flex flex-col items-center gap-4 max-w-md text-center animate-fade-in">
				<div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
					<Lock size={32} class="text-red-500" />
				</div>
				<h2 class="text-2xl font-semibold text-zinc-200">Unable to Load Paste</h2>
				<p class="text-zinc-400">{errorMessage}</p>
				<a
					href="/"
					class="mt-4 px-6 py-2 bg-teal-500 text-zinc-900 rounded font-medium transition-all duration-150 hover:bg-teal-400 active:scale-95 flex items-center gap-2"
				>
					<Plus size={16} />
					<span>Create New Paste</span>
				</a>
			</div>
		</div>
	{/if}

	<!-- Need Key State - Ask user to enter decryption key -->
	{#if viewState === 'needKey'}
		<div class="flex-1 flex items-center justify-center">
			<div class="flex flex-col items-center gap-4 max-w-md text-center animate-fade-in">
				<div class="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center">
					<Key size={32} class="text-teal-500" />
				</div>
				<h2 class="text-2xl font-semibold text-zinc-200">Enter Decryption Key</h2>
				<p class="text-zinc-400">This paste is encrypted. Enter the decryption key to view it.</p>
				<div class="w-full mt-2">
					<input
						type="text"
						bind:value={manualKey}
						placeholder="Paste your decryption key here..."
						class="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono text-sm"
						onkeydown={(e) => e.key === 'Enter' && decryptWithManualKey()}
					/>
				</div>
				<button
					onclick={decryptWithManualKey}
					disabled={!manualKey.trim()}
					class="mt-2 px-6 py-2 bg-teal-500 text-zinc-900 rounded font-medium transition-all duration-150 hover:bg-teal-400 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-teal-500"
				>
					<Lock size={16} />
					<span>Decrypt</span>
				</button>
			</div>
		</div>
	{/if}

	<!-- Need Password State - Ask user to enter password -->
	{#if viewState === 'needPassword'}
		<div class="flex-1 flex items-center justify-center">
			<div class="bg-zinc-800 rounded-lg p-8 max-w-md text-center">
				<Lock size={48} class="mx-auto mb-4 text-teal-500" />
				<h2 class="text-xl font-semibold mb-2">Password Protected</h2>
				<p class="text-zinc-400 mb-4">Enter the password to decrypt this paste.</p>
				<input
					type="password"
					bind:value={passwordInput}
					placeholder="Enter password..."
					class="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-2 mb-4"
					onkeydown={(e) => e.key === 'Enter' && decryptWithPassword()}
				/>
				<button
					onclick={decryptWithPassword}
					class="w-full px-4 py-2 bg-teal-500 text-zinc-900 rounded font-medium hover:bg-teal-400"
				>
					Decrypt
				</button>
				{#if errorMessage}
					<p class="text-red-400 mt-2 text-sm">{errorMessage}</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Burn Warning State - Warn user before viewing burn-after-read paste -->
	{#if viewState === 'burnWarning'}
		<div class="flex-1 flex items-center justify-center">
			<div class="bg-zinc-800 rounded-lg p-8 max-w-md text-center">
				<Flame size={48} class="mx-auto mb-4 text-orange-500" />
				<h2 class="text-xl font-semibold mb-2">Burn After Read</h2>
				<p class="text-zinc-400 mb-4">This paste will be <strong>permanently deleted</strong> after you view it.</p>
				<p class="text-zinc-500 text-sm mb-6">You cannot view it again. Make sure to copy the content if needed.</p>
				<div class="flex gap-3">
					<a href="/" class="flex-1 px-4 py-2 bg-zinc-700 text-zinc-100 rounded font-medium hover:bg-zinc-600">
						Cancel
					</a>
					<button
						onclick={confirmBurnAndView}
						class="flex-1 px-4 py-2 bg-orange-500 text-zinc-900 rounded font-medium hover:bg-orange-400"
					>
						View & Delete
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Success State - Display Content -->
	{#if viewState === 'success'}
		<!-- CodeMirror Viewer -->
		<div class="flex-1 min-h-0 overflow-auto">
			<CodeMirror
				value={content}
				lang={languageExtension}
				theme={currentTheme}
				extensions={[EditorView.lineWrapping, EditorView.editable.of(false)]}
				editable={false}
				styles={{
					'&': {
						height: '100%',
						fontSize: '14px'
					},
					'.cm-scroller': {
						overflow: 'auto'
					}
				}}
			/>
		</div>

		<!-- Info Bar -->
		<div class="flex items-center justify-center gap-4 py-4 border-t border-zinc-800 text-sm text-zinc-500">
			<span class="px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded text-xs font-mono">{detectedLanguage}</span>
			<span>·</span>
			<span>Created {createdTimeAgo}</span>
			<span>·</span>
			<span>Expires in {expiresIn}</span>
		</div>
	{/if}

	<!-- Footer badge - hidden on mobile -->
	<div class="hidden sm:flex absolute bottom-4 right-4 items-center gap-1.5 text-xs text-zinc-500 group cursor-default select-none transition-colors duration-200 hover:text-zinc-400">
		<Lock size={14} class="text-teal-500" />
		<span>End-to-end encrypted</span>
	</div>
</div>

<ShortcutsModal bind:open={showShortcuts} page="view" />
