import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	server: { host: true, allowedHosts: true },
	preview: { host: true, allowedHosts: true },
	test: {
		include: ['src/tests/**/*.test.ts'],
		environment: 'node'
	}
});
