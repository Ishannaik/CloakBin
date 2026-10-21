import adapterAuto from '@sveltejs/adapter-auto';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// SVELTEKIT_ADAPTER=node builds a standalone Node server (used by the Dockerfile).
// Anything else keeps adapter-auto, which detects Vercel, Netlify and similar hosts.
const adapter =
	process.env.SVELTEKIT_ADAPTER === 'node' ? adapterNode({ out: 'build' }) : adapterAuto();

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter
	}
};

export default config;
