<script lang="ts">
	import logo from '$lib/assets/logo.svg';
	import LazyCodeMirror from '$lib/components/LazyCodeMirror.svelte';
	import ExpirySelect from '$lib/components/ExpirySelect.svelte';
	import EncryptionOverlay from '$lib/components/EncryptionOverlay.svelte';
	import ImportModal from '$lib/components/ImportModal.svelte';
	import { javascript } from '@codemirror/lang-javascript';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { EditorView, keymap } from '@codemirror/view';
	import type { Extension } from '@codemirror/state';
	import type { LanguageSupport } from '@codemirror/language';
	import {
		detectLanguageFromFilename,
		LANGUAGE_PICKER_OPTIONS,
		isAllowedPasteLanguage,
		isPickerLanguage
	} from '$lib/languages';
	import {
		dracula,
		cobalt,
		coolGlow,
		amy,
		bespin,
		espresso,
		noctisLilac
	} from 'thememirror';
	import { spring } from 'svelte/motion';
	import { Lock, Files, Upload, WifiOff, Settings, FileUp } from 'lucide-svelte';
	import { goto, afterNavigate } from '$app/navigation';
	import { onMount, onDestroy, tick } from 'svelte';
	import { generateKey, encrypt, keyToBase64, generateSalt, deriveKeyFromPassword } from '$lib/crypto';
	// PERF: detectLanguage pulls highlight.js (~60-80KB) — dynamically imported at save time only (see below)
	import ShortcutsModal from '$lib/components/ShortcutsModal.svelte';

	// Dynamic language extension for CodeMirror (null = plaintext/no highlighting)
	let languageExtension = $state<LanguageSupport | null>(null);

	// Load language extension dynamically
	async function loadLanguageExtension(lang: string): Promise<LanguageSupport | null> {
		try {
			if (!isAllowedPasteLanguage(lang) && lang !== 'auto') {
				return null;
			}
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
				case 'yaml':
				case 'yml':
					return (await import('@codemirror/lang-yaml')).yaml();
				case 'auto':
				case 'plaintext':
				default:
					// No syntax highlighting for auto/plaintext
					return null;
			}
		} catch {
			return null;
		}
	}

	// Update language extension when selectedLanguage changes
	$effect(() => {
		if (selectedLanguage && selectedLanguage !== 'auto' && selectedLanguage !== 'plaintext') {
			loadLanguageExtension(selectedLanguage).then(ext => {
				languageExtension = ext;
			});
		} else {
			// No highlighting for auto/plaintext mode
			languageExtension = null;
		}
	});

	// Large paste threshold - show loading indicator for pastes over 1M chars
	const LARGE_PASTE_THRESHOLD = 1_000_000;

	// OS detection for keyboard shortcut display
	const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
	const mod = isMac ? '⌘' : 'Ctrl';

	let content = $state('');
	let expiry = $state('1h');
	let selectedTheme = $state('oneDark');

	// Persist theme to localStorage when it changes
	$effect(() => {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('cloakbin_theme', selectedTheme);
		}
	});
	let showDuplicateToast = $state(false);
	let showShortcuts = $state(false);
	let showSettings = $state(false);
	let showImportModal = $state(false);

	// Match hosted: mobile-viewport-aware height via --app-height (updates on resize)
	$effect(() => {
		const setAppHeight = () =>
			document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px');
		setAppHeight();
		window.addEventListener('resize', setAppHeight);
		return () => window.removeEventListener('resize', setAppHeight);
	});
	let settingsTab = $state<'language' | 'theme'>('language'); // Which tab is active
	let settingsSearch = $state(''); // Search filter for languages/themes
	let isOffline = $state(false);
	let usePassword = $state(false);
	let password = $state('');
	let burnAfterRead = $state(false);
	let selectedLanguage = $state('auto'); // 'auto' means auto-detect language using highlight.js

	// Available languages for manual selection (shared allowlist)
	const languages = LANGUAGE_PICKER_OPTIONS;

	// Cleanup references (need to be outside onMount for onDestroy to access)
	let saveInterval: ReturnType<typeof setInterval>;
	const handleOffline = () => (isOffline = true);
	const handleOnline = () => (isOffline = false);
	const handleClickOutside = (e: MouseEvent) => {
		const target = e.target as HTMLElement;
		if (!target.closest('.settings-dropdown')) {
			showSettings = false;
		}
	};

	// Check for duplicate content from view page (on initial load)
	onMount(async () => {
		await checkForDuplicate();

		// Restore theme from localStorage
		const savedTheme = localStorage.getItem('cloakbin_theme');
		if (savedTheme && savedTheme in themes) {
			selectedTheme = savedTheme;
		}

		// Restore draft from localStorage
		const draft = localStorage.getItem('cloakbin_draft');
		if (draft && !content) {
			content = draft;
		}

		// Auto-save draft every 3 seconds
		saveInterval = setInterval(() => {
			if (content.trim()) {
				localStorage.setItem('cloakbin_draft', content);
			} else {
				localStorage.removeItem('cloakbin_draft');
			}
		}, 3000);

		// Offline detection
		isOffline = !navigator.onLine;
		window.addEventListener('offline', handleOffline);
		window.addEventListener('online', handleOnline);

		// Close settings dropdown when clicking outside
		document.addEventListener('click', handleClickOutside);
	});

	// Cleanup on component destroy
	onDestroy(() => {
		clearInterval(saveInterval);
		if (typeof window !== 'undefined') {
			window.removeEventListener('offline', handleOffline);
			window.removeEventListener('online', handleOnline);
			document.removeEventListener('click', handleClickOutside);
		}
	});

	// Also check after client-side navigation (component may already be mounted)
	afterNavigate(async () => {
		await checkForDuplicate();
	});

	async function checkForDuplicate() {
		const duplicate = sessionStorage.getItem('cloakbin_duplicate');
		if (duplicate) {
			sessionStorage.removeItem('cloakbin_duplicate');
			await tick();
			content = duplicate;
			showDuplicateToast = true;
			setTimeout(() => {
				showDuplicateToast = false;
			}, 2500);
		}
	}
	let isCreating = $state(false);
	let encryptedPreview = $state(''); // ciphertext fed to the encrypt animation overlay

	// Large paste loading state
	let isLoadingPaste = $state(false);

	// Drag and drop state
	let isDragging = $state(false);
	let dragCounter = 0; // Track enter/leave to handle nested elements

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		dragCounter++;
		if (e.dataTransfer?.types.includes('Files')) {
			isDragging = true;
		}
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragCounter--;
		if (dragCounter === 0) {
			isDragging = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragCounter = 0;
		isDragging = false;

		const items = e.dataTransfer?.items;
		if (items && items.length > 0) {
			const item = items[0];
			// Silently ignore directory drops
			if (item.kind === 'file' && item.webkitGetAsEntry()?.isDirectory) {
				return;
			}
		}

		const file = e.dataTransfer?.files[0];
		if (!file) return;

		// Check if it's a text file
		if (!file.type.startsWith('text/') && !file.name.match(/\.(txt|js|ts|json|md|css|html|xml|yaml|yml|py|rb|go|rs|java|c|cpp|h|sh|bash|sql|env|conf|cfg|ini|log|csv)$/i)) {
			alert('Please drop a text file');
			return;
		}

		try {
			const text = await file.text();
			content = text;
		} catch (error) {
			console.error('Failed to read file:', error);
			alert('Failed to read file');
		}
	}

	// New button animation state
	let logoClicks = 0;
	let newButtonScale = spring(1, { stiffness: 0.3, damping: 0.6 });
	let newButtonRotation = spring(0, { stiffness: 0.2, damping: 0.5 });
	let newButtonSuccess = $state(false);


	function handleNewClick() {
		// Spring bounce effect
		newButtonScale.set(0.9);
		setTimeout(() => newButtonScale.set(1.05), 100);
		setTimeout(() => newButtonScale.set(1), 200);

		// Rotate the plus icon
		newButtonRotation.update((r) => r + 180);

		// Clear the editor
		content = '';

		// Success flash
		newButtonSuccess = true;
		setTimeout(() => {
			newButtonSuccess = false;
		}, 600);
	}


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

	const expiryOptions = [
		{ value: '1h', label: '1 Hour' },
		{ value: '24h', label: '24 Hours' },
		{ value: '7d', label: '7 Days' }
	];

	// CodeMirror extension for Ctrl+A to select only editor content
	const selectAllExtension = keymap.of([
		{
			key: 'Mod-a',
			run: (view) => {
				view.dispatch({
					selection: { anchor: 0, head: view.state.doc.length }
				});
				return true; // Prevent default browser behavior
			}
		}
	]);

	// CodeMirror extension for handling large pastes
	// Shows a brief loading indicator, then lets CodeMirror handle it (it's optimized)
	const largePasteHandler = EditorView.domEventHandlers({
		paste(event, view) {
			const text = event.clipboardData?.getData('text/plain');
			if (!text || text.length < LARGE_PASTE_THRESHOLD) {
				return false; // Let CodeMirror handle normally
			}

			event.preventDefault();

			// Show loading spinner
			isLoadingPaste = true;

			// Use requestAnimationFrame to let the UI update, then insert all at once
			requestAnimationFrame(() => {
				const from = view.state.selection.main.from;
				view.dispatch({
					changes: { from, insert: text },
					selection: { anchor: from + text.length }
				});

				isLoadingPaste = false;
			});

			return true;
		}
	});

	// Global keyboard shortcuts handler
	function handleKeydown(e: KeyboardEvent) {
		// Show shortcuts modal on ? or Ctrl+/
		if (e.key === '?' || ((e.ctrlKey || e.metaKey) && e.key === '/')) {
			e.preventDefault();
			showShortcuts = !showShortcuts;
			return;
		}

		const isMod = e.ctrlKey || e.metaKey;

		// Ctrl+S - Create paste
		if (isMod && e.key.toLowerCase() === 's') {
			e.preventDefault();
			if (content.trim() && !isCreating) {
				createPaste();
			}
			return;
		}

		// Ctrl+Shift+N - New (clear editor)
		if (isMod && e.shiftKey && e.key.toLowerCase() === 'n') {
			e.preventDefault();
			handleNewClick();
			return;
		}
	}

	async function createPaste() {
		if (!content.trim()) return;
		if (usePassword && !password.trim()) return;
		isCreating = true;

		try {
			let key: CryptoKey;
			let salt: string | null = null;
			let urlKey: string | null = null;

			if (usePassword && password.trim()) {
				// Password-protected paste: derive key from password
				salt = generateSalt();
				key = await deriveKeyFromPassword(password, salt);
				// No URL key needed - password IS the key
			} else {
				// Regular paste: generate random key for URL
				key = await generateKey();
				urlKey = await keyToBase64(key);
			}

			// Use selected language or auto-detect (highlight.js loaded lazily only when needed)
			let language = selectedLanguage;
			if (selectedLanguage === 'auto') {
				const { detectLanguage } = await import('$lib/detectLanguage');
				language = detectLanguage(content);
			}

			// Encrypt content
			const encrypted = await encrypt(content, key);
			// Feed the ciphertext to the encrypt-animation overlay (morphs the editor content)
			encryptedPreview = encrypted;
			const morphStart = performance.now();

			// POST to API
			const res = await fetch('/api/paste', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: encrypted,
					expiry,
					salt,
					burnAfterRead,
					language
				})
			});

			if (!res.ok) {
				const error = await res.text();
				throw new Error(error || 'Failed to create paste');
			}

			// Handle response
			const { id } = await res.json();

			// Clear draft on successful create
			localStorage.removeItem('cloakbin_draft');

			// Let the encrypt animation play its full duration before navigating away
			const MORPH_MS = 2000;
			const remaining = MORPH_MS - (performance.now() - morphStart);
			if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
			content = ''; // Clear content so back button shows empty editor

			// Redirect to view page
			if (urlKey) {
				// Regular paste: key in URL fragment
				await goto(`/p/${id}#${urlKey}`);
			} else {
				// Password-protected: no key in URL
				await goto(`/p/${id}`);
			}
		} catch (error) {
			console.error('Error creating paste:', error);
			alert(error instanceof Error ? error.message : 'Failed to create paste. Please try again.');
		} finally {
			isCreating = false;
			encryptedPreview = '';
		}
	}
</script>

<svelte:head>
	<title>CloakBin - Free Encrypted Pastebin with Zero-Knowledge Encryption</title>
	<meta name="description" content="Share code and text securely with end-to-end encryption. Your content is encrypted before it leaves your browser - we can never see it." />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content="CloakBin - Free Encrypted Pastebin with Zero-Knowledge Encryption" />
	<meta property="og:description" content="Share code and text securely with end-to-end encryption. Your content is encrypted before it leaves your browser." />
	<meta property="og:image" content="/og-image-logo.png" />
	<meta property="og:url" content="https://cloakbin.com" />
	<meta property="og:site_name" content="CloakBin" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="CloakBin - Free Encrypted Pastebin with Zero-Knowledge Encryption" />
	<meta name="twitter:description" content="Share code and text securely with end-to-end encryption. Your content is encrypted before it leaves your browser." />
	<meta name="twitter:image" content="/og-image-logo.png" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div
	class="flex flex-col relative overflow-hidden"
	style="background-color:#1a1d23; height:var(--app-height,100vh)"
	role="application"
	aria-label="Paste editor with drag and drop support"
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
>
	<h1 class="sr-only">CloakBin — Free Encrypted Pastebin with Zero-Knowledge Client-Side Encryption</h1>
	<!-- Header -->
	<header class="flex items-center justify-between px-3 sm:px-4 py-0 sm:py-1 border-b border-zinc-800">
		<a href="/" class="flex items-center gap-2.5 group cursor-pointer">
			<img
				src={logo}
				alt="CloakBin"
				class="w-12 h-12 sm:w-11 sm:h-11 md:w-12 md:h-12 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3 cursor-pointer"
				onclick={() => { logoClicks++; if (logoClicks >= 3) { console.log('%c🔒 CloakBin', 'font-size:24px;color:#14b8a6;font-weight:bold;'); console.log('Zero-knowledge encryption. The server never sees your data.'); logoClicks = 0; } }}
				role="button"
				tabindex="0"
			/>
			<span class="hidden sm:inline text-lg sm:text-xl md:text-2xl font-semibold text-teal-400 transition-colors duration-200 group-hover:text-teal-300">CloakBin</span>
		</a>
		<div class="flex items-center gap-2">
			<!-- Primary: New -->
			<button
				onclick={handleNewClick}
				title="{mod}+Shift+N"
				class="h-9 sm:h-10 min-w-9 sm:min-w-0 px-2 sm:px-3 rounded font-medium transition-all duration-150 flex items-center justify-center gap-1.5 sm:gap-2 {newButtonSuccess ? 'bg-green-500 hover:bg-green-400' : 'bg-teal-500 hover:bg-teal-400'} text-zinc-900 active:scale-95"
				style="transform: scale({$newButtonScale})"
			>
				<span
					class="inline-block"
					style="transform: rotate({$newButtonRotation}deg)"
				>+</span>
				<span class="hidden sm:inline">{newButtonSuccess ? 'Cleared!' : 'New'}</span>
			</button>
			<!-- Import -->
			<button
				onclick={() => (showImportModal = true)}
				title="Import a file"
				class="p-2 sm:p-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded font-medium transition-all duration-150 active:scale-95 flex items-center gap-1.5"
			>
				<FileUp size={16} class="sm:hidden" /><FileUp size={18} class="hidden sm:block" />
				<span class="hidden md:inline text-sm">Import</span>
			</button>
			<!-- Settings dropdown -->
			<div class="relative settings-dropdown">
				<button
					onclick={() => showSettings = !showSettings}
					class="p-2 sm:p-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded font-medium transition-all duration-150 active:scale-95"
					title="Settings"
				>
					<Settings size={16} class="sm:hidden" /><Settings size={18} class="hidden sm:block" />
				</button>
				{#if showSettings}
					{@const filteredLanguages = languages.filter(l =>
						l.label.toLowerCase().includes(settingsSearch.toLowerCase()) ||
						l.value.toLowerCase().includes(settingsSearch.toLowerCase())
					)}
					{@const filteredThemes = Object.entries(themes).filter(([key, { name }]) =>
						name.toLowerCase().includes(settingsSearch.toLowerCase()) ||
						key.toLowerCase().includes(settingsSearch.toLowerCase())
					)}
					<div class="absolute right-0 top-full mt-2 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 animate-fade-in">
						<!-- Tab buttons side by side -->
						<div class="flex border-b border-zinc-700">
							<button
								onclick={() => { settingsTab = 'language'; settingsSearch = ''; }}
								class="flex-1 px-3 py-2 text-sm font-medium transition-colors duration-150 {settingsTab === 'language' ? 'text-teal-400 border-b-2 border-teal-400 -mb-px' : 'text-zinc-400 hover:text-zinc-300'}"
							>
								Language
							</button>
							<button
								onclick={() => { settingsTab = 'theme'; settingsSearch = ''; }}
								class="flex-1 px-3 py-2 text-sm font-medium transition-colors duration-150 {settingsTab === 'theme' ? 'text-teal-400 border-b-2 border-teal-400 -mb-px' : 'text-zinc-400 hover:text-zinc-300'}"
							>
								Theme
							</button>
						</div>
						<!-- Search input -->
						<div class="p-2 border-b border-zinc-700">
							<input
								type="text"
								bind:value={settingsSearch}
								placeholder="Search..."
								class="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-500"
							/>
						</div>
						<!-- Tab content -->
						<div class="p-2 max-h-52 overflow-y-auto">
							{#if settingsTab === 'language'}
								{#each filteredLanguages as { value, label }}
									<button
										onclick={() => { selectedLanguage = value; }}
										class="w-full text-left px-3 py-1.5 rounded text-sm transition-colors duration-150 {selectedLanguage === value ? 'bg-teal-500/20 text-teal-400' : 'hover:bg-zinc-700 text-zinc-300'}"
									>
										{label}
									</button>
								{:else}
									<p class="text-xs text-zinc-500 text-center py-2">No matches</p>
								{/each}
							{:else}
								{#each filteredThemes as [key, { name }]}
									<button
										onclick={() => { selectedTheme = key; }}
										class="w-full text-left px-3 py-1.5 rounded text-sm transition-colors duration-150 {selectedTheme === key ? 'bg-teal-500/20 text-teal-400' : 'hover:bg-zinc-700 text-zinc-300'}"
									>
										{name}
									</button>
								{:else}
									<p class="text-xs text-zinc-500 text-center py-2">No matches</p>
								{/each}
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<!-- Editor -->
	<div class="flex-1 min-h-0 overflow-auto relative">
		<LazyCodeMirror
			bind:value={content}
			lang={languageExtension}
			theme={currentTheme}
			extensions={[EditorView.lineWrapping, largePasteHandler, selectAllExtension]}
			styles={{
				'&': {
					height: '100%',
					fontSize: '14px'
				},
				'.cm-scroller': {
					overflow: 'auto'
				}
			}}
			placeholder="// Paste something private..."
		/>
		<!-- Encrypt animation: cipher-morph overlay while creating -->
		<EncryptionOverlay
			active={isCreating}
			sourceText={content}
			encryptedText={encryptedPreview}
			onFrame={(text) => { content = text; }}
		/>
	</div>

	<!-- Bottom bar -->
	<div class="flex flex-wrap items-center justify-center gap-2 sm:gap-4 px-4 py-3 sm:py-4 border-t border-zinc-800">
		<ExpirySelect bind:value={expiry} options={expiryOptions} />
		<!-- Password toggle -->
		<label class="flex items-center gap-1.5 cursor-pointer">
			<input
				type="checkbox"
				bind:checked={usePassword}
				class="w-4 h-4 cursor-pointer appearance-none rounded border border-zinc-600 bg-zinc-800 checked:bg-teal-500 checked:border-teal-500 relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[10px] checked:after:text-zinc-900 checked:after:font-bold"
			/>
			<Lock size={14} class="text-zinc-400" />
			<span class="text-zinc-400 text-sm hidden sm:inline">Password</span>
		</label>
		{#if usePassword}
			<input
				type="password"
				bind:value={password}
				placeholder="Password..."
				maxlength={128}
				class="bg-bg-secondary border border-zinc-700 rounded px-2 py-2 text-sm w-24 sm:w-32 focus:outline-none focus:border-teal-500"
			/>
		{/if}
		<!-- Burn toggle -->
		<label class="relative flex items-center gap-1.5 cursor-pointer group">
			<input
				type="checkbox"
				bind:checked={burnAfterRead}
				aria-describedby="burn-tooltip"
				class="w-4 h-4 cursor-pointer appearance-none rounded border border-zinc-600 bg-zinc-800 checked:bg-orange-500 checked:border-orange-500 relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[10px] checked:after:text-zinc-900 checked:after:font-bold"
			/>
			<span class="text-orange-500">🔥</span>
			<span class="text-zinc-400 text-sm hidden sm:inline">Burn</span>
			<span id="burn-tooltip" role="tooltip" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-zinc-900 text-xs text-zinc-100 whitespace-nowrap opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 z-10">
				Paste is permanently deleted after the first view.
			</span>
		</label>
		<!-- Primary: Create -->
		<button
			onclick={createPaste}
			disabled={!content.trim() || isCreating || (usePassword && !password.trim())}
			title="{mod}+S"
			class="px-4 sm:px-6 py-2 bg-teal-500 text-zinc-900 rounded font-medium transition-all duration-150 hover:bg-teal-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
		>
			{#if isCreating}
				<span class="flex items-center gap-1">
					Creating
					<span class="flex gap-0.5">
						<span class="w-1 h-1 bg-zinc-900 rounded-full animate-bounce-dot" style="animation-delay: 0ms"></span>
						<span class="w-1 h-1 bg-zinc-900 rounded-full animate-bounce-dot" style="animation-delay: 150ms"></span>
						<span class="w-1 h-1 bg-zinc-900 rounded-full animate-bounce-dot" style="animation-delay: 300ms"></span>
					</span>
				</span>
			{:else}
				Create
			{/if}
		</button>
	</div>

	<!-- Footer badge - hidden on mobile -->
	<div class="hidden sm:flex absolute bottom-4 right-4 items-center gap-1.5 text-xs text-zinc-500 group cursor-default select-none transition-colors duration-200 hover:text-zinc-400">
		<Lock size={14} class="text-teal-500" />
		<span>End-to-end encrypted</span>
	</div>

	<!-- Large paste loading overlay -->
	{#if isLoadingPaste}
		<div class="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
			<div class="bg-zinc-800 rounded-lg p-6 shadow-2xl flex flex-col items-center gap-3 animate-scale-in">
				<div class="w-8 h-8 border-3 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"></div>
				<p class="text-zinc-300 text-sm">Loading paste...</p>
			</div>
		</div>
	{/if}

	<!-- Duplicate toast notification -->
	{#if showDuplicateToast}
		<div class="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
			<div class="bg-teal-500 text-zinc-900 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-medium">
				<Files size={16} />
				<span>Content duplicated!</span>
			</div>
		</div>
	{/if}

	<!-- Offline banner -->
	{#if isOffline}
		<div class="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-zinc-900 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
			<WifiOff size={16} />
			<span>You're offline. Your draft is saved locally.</span>
		</div>
	{/if}

	<!-- Drag and drop overlay -->
	{#if isDragging}
		<div class="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in pointer-events-none">
			<div class="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-teal-500 rounded-2xl bg-zinc-800/50">
				<div class="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center">
					<Upload size={32} class="text-teal-500" />
				</div>
				<div class="text-center">
					<p class="text-xl font-semibold text-zinc-100">Drop file to paste</p>
					<p class="text-sm text-zinc-400 mt-1">Release to load file contents</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<ShortcutsModal bind:open={showShortcuts} page="home" />

<ImportModal
	bind:open={showImportModal}
	onImport={(text, filename) => {
		content = text;
		const language = detectLanguageFromFilename(filename);
		if (language && isPickerLanguage(language)) selectedLanguage = language;
	}}
/>
