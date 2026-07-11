import { defineConfig } from 'vitest/config';

// Isolated unit-test config (does not load the SvelteKit vite plugin).
// Tests target pure server modules with no $app/$env aliases.
export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts']
	}
});
