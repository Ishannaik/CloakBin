<script lang="ts">
	import { Lock, X } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { browser } from '$app/environment';

	// Dismissed state persisted in localStorage (OSS has no preferences store)
	let dismissed = $state(browser && localStorage.getItem('encryptionBannerDismissed') === 'true');

	function handleDismiss() {
		dismissed = true;
		if (browser) localStorage.setItem('encryptionBannerDismissed', 'true');
	}
</script>

{#if !dismissed}
	<div
		class="w-full bg-teal-500/10 border-b border-teal-500/20 px-3 sm:px-4 py-2"
		transition:slide={{ duration: 200 }}
	>
		<div class="flex items-center justify-center gap-2 sm:gap-3 text-sm">
			<Lock class="w-4 h-4 text-teal-400 shrink-0" />
			<span class="text-teal-200">
				<span class="font-medium">We can't read your pastes.</span>
				<span class="text-teal-200/70 hidden sm:inline"> Encrypted in your browser.</span>
			</span>
			<a
				href="https://github.com/Ishannaik/CloakBin#readme"
				target="_blank"
				rel="noopener"
				class="text-teal-400 hover:text-teal-300 transition-colors text-xs sm:text-sm"
			>
				Learn more
			</a>
			<button
				onclick={handleDismiss}
				class="text-teal-400/60 hover:text-teal-400 transition-colors p-0.5 -mr-1"
				aria-label="Dismiss"
			>
				<X class="w-4 h-4" />
			</button>
		</div>
	</div>
{/if}
