import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: '0.0.0.0',
		port: 1420,
		strictPort: true
	},
	preview: {
		host: '0.0.0.0',
		port: 1420,
		strictPort: true
	},
	resolve: {
		dedupe: ['svelte'],
		conditions: ['svelte', 'module', 'import', 'default']
	},
	build: {
		sourcemap: true,
		minify: 'esbuild'
	}
});
