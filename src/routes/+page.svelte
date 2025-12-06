<script lang="ts">
	import logo from '$lib/assets/logo.png?enhanced';
	import CodeMirror from 'svelte-codemirror-editor';
	import { javascript } from '@codemirror/lang-javascript';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { EditorView, keymap } from '@codemirror/view';
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
	import { Lock, Files, Upload, WifiOff } from 'lucide-svelte';
	import { goto, afterNavigate } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { generateKey, encrypt, keyToBase64 } from '$lib/crypto';
	import ShortcutsModal from '$lib/components/ShortcutsModal.svelte';

	// Large paste threshold - show loading indicator for pastes over 1M chars
	const LARGE_PASTE_THRESHOLD = 1_000_000;

	// OS detection for keyboard shortcut display
	const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
	const mod = isMac ? '⌘' : 'Ctrl';

	let content = $state('');
	let expiry = $state('1h');
	let selectedTheme = $state('oneDark');
	let showDuplicateToast = $state(false);
	let showShortcuts = $state(false);
	let isOffline = $state(false);

	// Check for duplicate content from view page (on initial load)
	onMount(async () => {
		await checkForDuplicate();

		// Restore draft from localStorage
		const draft = localStorage.getItem('cloakbin_draft');
		if (draft && !content) {
			content = draft;
		}

		// Auto-save draft every 3 seconds
		const saveInterval = setInterval(() => {
			if (content.trim()) {
				localStorage.setItem('cloakbin_draft', content);
			} else {
				localStorage.removeItem('cloakbin_draft');
			}
		}, 3000);

		// Offline detection
		isOffline = !navigator.onLine;
		const handleOffline = () => (isOffline = true);
		const handleOnline = () => (isOffline = false);
		window.addEventListener('offline', handleOffline);
		window.addEventListener('online', handleOnline);

		return () => {
			clearInterval(saveInterval);
			window.removeEventListener('offline', handleOffline);
			window.removeEventListener('online', handleOnline);
		};
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
		isCreating = true;

		try {
			// 1. Generate encryption key
			const key = await generateKey();

			// 2. Encrypt content
			const encrypted = await encrypt(content, key);

			// 3. Export key for URL
			const urlKey = await keyToBase64(key);

			// 4. POST to API
			const res = await fetch('/api/paste', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: encrypted, expiry })
			});

			if (!res.ok) {
				const error = await res.text();
				throw new Error(error || 'Failed to create paste');
			}

			// 5. Handle response
			const { id } = await res.json();

			// Clear draft on successful create
			localStorage.removeItem('cloakbin_draft');

			// Redirect to view page with key in URL fragment
			await goto(`/p/${id}#${urlKey}`);
		} catch (error) {
			console.error('Error creating paste:', error);
			alert(error instanceof Error ? error.message : 'Failed to create paste. Please try again.');
		} finally {
			isCreating = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="h-screen flex flex-col relative overflow-hidden"
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
>
	<!-- Header -->
	<header class="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
		<div class="flex items-center gap-3 group cursor-pointer">
			<enhanced:img
				src={logo}
				alt="CloakBin"
				class="w-8 h-8 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3"
			/>
			<span class="text-xl font-semibold text-teal-400 transition-colors duration-200 group-hover:text-teal-300">CloakBin</span>
		</div>
		<!-- Primary: New -->
		<button
			onclick={handleNewClick}
			title="{mod}+Shift+N"
			class="px-4 py-2 rounded font-medium transition-all duration-150 flex items-center gap-2 {newButtonSuccess ? 'bg-green-500 hover:bg-green-400' : 'bg-teal-500 hover:bg-teal-400'} text-zinc-900 active:scale-95"
			style="transform: scale({$newButtonScale})"
		>
			<span
				class="inline-block"
				style="transform: rotate({$newButtonRotation}deg)"
			>+</span>
			{newButtonSuccess ? 'Cleared!' : 'New'}
		</button>
	</header>

	<!-- Editor -->
	<div class="flex-1 min-h-0 overflow-auto">
		<CodeMirror
			bind:value={content}
			lang={javascript()}
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
	</div>

	<!-- Bottom bar -->
	<div class="flex items-center justify-center gap-4 py-4 border-t border-zinc-800">
		<div class="flex items-center gap-2">
			<span class="text-zinc-500 text-sm">Theme:</span>
			<select
				bind:value={selectedTheme}
				class="bg-[#242830] border border-zinc-700 rounded px-3 py-2 text-sm cursor-pointer transition-all duration-150 hover:border-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
			>
				{#each Object.entries(themes) as [key, { name }]}
					<option value={key}>{name}</option>
				{/each}
			</select>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-zinc-500 text-sm">Expiry:</span>
			<select
				bind:value={expiry}
				class="bg-[#242830] border border-zinc-700 rounded px-3 py-2 text-sm cursor-pointer transition-all duration-150 hover:border-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
			>
				{#each expiryOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
		<!-- Primary: Create -->
		<button
			onclick={createPaste}
			disabled={!content.trim() || isCreating}
			title="{mod}+S"
			class="px-6 py-2 bg-teal-500 text-zinc-900 rounded font-medium transition-all duration-150 hover:bg-teal-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
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

	<!-- Footer badge -->
	<div class="absolute bottom-4 right-4 flex items-center gap-1.5 text-xs text-zinc-500 group cursor-default select-none transition-colors duration-200 hover:text-zinc-400">
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
