<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';

	let { children } = $props();

	const siteName = 'CloakBin';
	const siteUrl = 'https://cloakbin.vercel.app';
	const description = 'Zero-knowledge encrypted pastebin. Share secrets safely with end-to-end encryption. Your data never touches our servers unencrypted.';
	const ogImage = `${siteUrl}/og-image.png`;
</script>

<svelte:head>
	<!-- Primary Meta Tags -->
	<title>{siteName} - Zero-Knowledge Encrypted Pastebin</title>
	<meta name="title" content="{siteName} - Zero-Knowledge Encrypted Pastebin" />
	<meta name="description" content={description} />
	<meta name="keywords" content="pastebin, encrypted, zero-knowledge, privacy, secure, paste, share, secret, anonymous" />
	<meta name="author" content="CloakBin" />
	<meta name="theme-color" content="#14b8a6" />

	<!-- Favicon -->
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="/logo.svg" />

	<!-- Canonical -->
	<link rel="canonical" href={siteUrl} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={siteUrl} />
	<meta property="og:title" content="{siteName} - Zero-Knowledge Encrypted Pastebin" />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:site_name" content={siteName} />

	<!-- Twitter -->
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:url" content={siteUrl} />
	<meta property="twitter:title" content="{siteName} - Zero-Knowledge Encrypted Pastebin" />
	<meta property="twitter:description" content={description} />
	<meta property="twitter:image" content={ogImage} />
</svelte:head>

{@render children()}
