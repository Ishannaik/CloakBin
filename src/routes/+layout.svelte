<script lang="ts">
	import '../app.css';
	import { page, navigating } from '$app/stores';
	import MatrixRain from '$lib/components/MatrixRain.svelte';
	import EncryptionBanner from '$lib/components/EncryptionBanner.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { jsonLd } from '$lib/utils/json-ld';

	let { children } = $props();

	// Easter egg state
	const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
	let konamiSequence = $state<string[]>([]);
	let showMatrixRain = $state(false);
	let cloakBuffer = $state('');
	let isCloaked = $state(false);

	function handleEasterEggKeydown(e: KeyboardEvent) {
		// Skip if typing in input/textarea
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

		// Konami code: ↑↑↓↓←→←→BA → Matrix Rain
		konamiSequence = [...konamiSequence, e.key].slice(-10);
		if (konamiSequence.join(',') === KONAMI.join(',')) {
			showMatrixRain = true;
			setTimeout(() => (showMatrixRain = false), 8000);
			konamiSequence = [];
		}

		// Typing "cloak" fades the page for 2 seconds
		if (e.key.length === 1) {
			cloakBuffer += e.key.toLowerCase();
			if (cloakBuffer.endsWith('cloak')) {
				isCloaked = true;
				setTimeout(() => (isCloaked = false), 2000);
				cloakBuffer = '';
			}
			if (cloakBuffer.length > 10) cloakBuffer = cloakBuffer.slice(-5);
		}
	}

	const siteName = 'CloakBin';
	const siteUrl = 'https://cloakbin.com';
	const baseDescription =
		"Free encrypted pastebin with zero-knowledge client-side encryption. Your data is encrypted in your browser before it reaches our servers — we can't read your pastes. Share code, API keys, and secrets securely.";
	const ogImage = `${siteUrl}/og-image.png`;
	const canonicalUrl = $derived(`${siteUrl}${$page.url.pathname}`);

	const structuredData = {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebApplication',
				'@id': `${siteUrl}/#webapp`,
				name: 'CloakBin',
				url: siteUrl,
				description: baseDescription,
				applicationCategory: 'SecurityApplication',
				operatingSystem: 'Web Browser',
				offers: {
					'@type': 'Offer',
					price: '0',
					priceCurrency: 'USD'
				},
				featureList: [
					'Zero-knowledge encryption',
					'Client-side AES-256-GCM encryption',
					'Password-protected pastes',
					'Self-destructing pastes',
					'Syntax highlighting'
				],
				browserRequirements: 'Requires JavaScript and modern browser with Web Crypto API support'
			},
			{
				'@type': 'Organization',
				'@id': `${siteUrl}/#organization`,
				name: 'CloakBin',
				url: siteUrl,
				logo: {
					'@type': 'ImageObject',
					url: `${siteUrl}/android-chrome-512x512.png`,
					width: 512,
					height: 512
				}
			},
			{
				'@type': 'WebSite',
				'@id': `${siteUrl}/#website`,
				url: siteUrl,
				name: 'CloakBin',
				description: baseDescription
			}
		]
	};
</script>

<svelte:window onkeydown={handleEasterEggKeydown} />

<!-- Easter egg: Matrix Rain (Konami code) -->
{#if showMatrixRain}
	<MatrixRain />
{/if}

<svelte:head>
	<!-- Primary Meta Tags -->
	<title>{siteName} - Free Encrypted Pastebin | Zero-Knowledge Encryption</title>
	<meta name="title" content="{siteName} - Free Encrypted Pastebin | Zero-Knowledge Encryption" />
	<meta name="description" content={baseDescription} />
	<meta
		name="keywords"
		content="encrypted pastebin, zero-knowledge pastebin, secure pastebin, private pastebin, encrypted paste, pastebin alternative, end-to-end encryption, client-side encryption, AES-256, share secrets securely, anonymous paste, cloakbin"
	/>
	<meta name="author" content="CloakBin" />
	<meta name="robots" content="index, follow" />
	<meta name="color-scheme" content="dark" />

	<!-- Canonical -->
	<link rel="canonical" href={canonicalUrl} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonicalUrl} />
	<meta
		property="og:title"
		content="{siteName} - Free Encrypted Pastebin | Zero-Knowledge Encryption"
	/>
	<meta property="og:description" content={baseDescription} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="CloakBin - Free Encrypted Pastebin" />
	<meta property="og:site_name" content={siteName} />
	<meta property="og:locale" content="en_US" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={canonicalUrl} />
	<meta
		name="twitter:title"
		content="{siteName} - Free Encrypted Pastebin | Zero-Knowledge Encryption"
	/>
	<meta name="twitter:description" content={baseDescription} />
	<meta name="twitter:image" content={ogImage} />
	<meta name="twitter:image:alt" content="CloakBin - Free Encrypted Pastebin" />
	<meta name="twitter:site" content="@cloakbin" />

	<!-- Mobile / PWA Meta Tags -->
	<meta name="application-name" content="CloakBin" />
	<meta name="apple-mobile-web-app-title" content="CloakBin" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="format-detection" content="telephone=no" />

	<!-- Structured Data (JSON-LD) -->
	{@html `<script type="application/ld+json">${jsonLd(structuredData)}</script>`}
</svelte:head>

<!-- Skip navigation for keyboard / screen reader users -->
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-teal-500 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-zinc-900"
>
	Skip to main content
</a>

<!-- Navigation progress bar — shows during SvelteKit page transitions -->
{#if $navigating}
	<div class="fixed top-0 left-0 right-0 h-0.5 bg-teal-500/20 z-[100]">
		<div class="h-full bg-teal-400 animate-progress-indeterminate w-1/4"></div>
	</div>
{/if}

<!-- Zero-knowledge teaching banner -->
<EncryptionBanner />

<!-- Easter egg: "cloak" typing fades page to 10% opacity -->
<div class="transition-opacity duration-500 {isCloaked ? 'opacity-10' : 'opacity-100'}">
	<main id="main-content" tabindex="-1">
		{@render children()}
	</main>
	<Footer />
</div>

<style>
	@keyframes progress-indeterminate {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(400%);
		}
	}

	:global(.animate-progress-indeterminate) {
		animation: progress-indeterminate 1s ease-in-out infinite;
	}
</style>
