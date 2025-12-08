import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		enhancedImages(),
		sveltekit(),
		tailwindcss({
			exclude: [/node_modules/]
		})
	],
	build: {
		target: 'es2022'
	},
	optimizeDeps: {
		exclude: [
			'svelte-codemirror-editor',
			'codemirror',
			'@codemirror/lang-javascript',
			'@codemirror/language',
			'@codemirror/state',
			'@codemirror/view',
			'@codemirror/theme-one-dark',
			'thememirror'
		]
	}
});
