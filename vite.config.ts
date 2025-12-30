import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Workaround for Tailwind v4 Vite plugin processing svelte-codemirror-editor virtual CSS modules
// See: https://github.com/tailwindlabs/tailwindcss/discussions/16712
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tailwindPlugins = tailwindcss().map((plugin: any) => {
	if (plugin.name === '@tailwindcss/vite:generate:serve') {
		const originalTransform = plugin.transform;
		// Get the actual transform function (handle both direct function and object with handler)
		const transformFn =
			typeof originalTransform === 'function' ? originalTransform : originalTransform?.handler;
		return {
			...plugin,
			transform(code: string, id: string, options: unknown) {
				// Skip processing virtual CSS modules from svelte-codemirror-editor
				if (id.includes('svelte-codemirror-editor') && id.includes('type=style')) {
					return;
				}
				return transformFn?.call(this, code, id, options);
			}
		};
	}
	return plugin;
});

export default defineConfig({
	plugins: [enhancedImages(), sveltekit(), ...tailwindPlugins],
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
