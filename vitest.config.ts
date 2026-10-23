import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Isolated unit-test config (does not load the SvelteKit vite plugin).
// Most tests target pure server modules. Route tests resolve $lib and
// $env/dynamic/private through the aliases below.
export default defineConfig({
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
			'$env/dynamic/private': fileURLToPath(new URL('./src/test/env-stub.ts', import.meta.url))
		}
	},
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts']
	}
});
