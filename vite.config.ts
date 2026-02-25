import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig(({ mode }) => {
    const isProduction = mode === 'production';
    
    return {
		plugins: [
		    sveltekit(),
		    SvelteKitPWA({
			    srcDir: './src',
			    mode: 'production',
			    strategies: 'generateSW',
			    registerType: 'autoUpdate',
			    
			    scope: '/web/',
			    base: '/web/',
			    
			    manifest: {
			    name: 'Pigeon App',
			    short_name: 'Pigeon',
			    start_url: '/web/',
			    display: 'standalone',
			    background_color: "#0d0d12",
			    theme_color: "#1d1e25",
			    lang: 'en',
			    description: 'Pigeon Messaging App',
			    orientation: 'portrait-primary',
			    categories: ['communication', 'social'],
			    
			    icons: [
				    {
					    src: '/web/pwa-512x512.png',
					    sizes: '512x512',
					    type: 'image/png',
					    purpose: 'any maskable'
				    },
				    {
					    src: '/web/pwa-192x192.png',
					    sizes: '192x192',
					    type: 'image/png',
					    purpose: 'any maskable'
				    },
				    {
					    src: '/web/pwa-512x512.png',
					    sizes: '512x512',
					    type: 'image/png',
					    purpose: 'any maskable'
				    },
				    {
					    src: '/web/maskable-icon-512x512.png',
					    sizes: '512x512',
					    type: 'image/png',
					    purpose: 'maskable'
				    }
			    ]
		    },
			    
		    workbox: {
		        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf,eot,json}'],
		        globDirectory: '.svelte-kit/output/client',
		        
		        navigateFallback: '/web/',
		        navigateFallbackAllowlist: [/^\/web\//],
		        
		        runtimeCaching: [
			        {
			            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
			            handler: 'CacheFirst',
			            options: {
				            cacheName: 'images-cache',
				            expiration: {
				                maxEntries: 100,
				                maxAgeSeconds: 30 * 24 * 60 * 60
				            }
			            }
			        }
		        ],
		        
		        mode: isProduction ? 'production' : 'development',
		        cleanupOutdatedCaches: true,
		        skipWaiting: true,
		        clientsClaim: true
	        },
		    
	        devOptions: {
	            enabled: true,
	            type: 'module',
	            navigateFallback: '/',
	            suppressWarnings: true
            },
	        injectRegister: 'auto',
	        pwaAssets: {
		            disabled: false,
		            config: true
		        }
	        })
	    ],
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
		    sourcemap: !isProduction,
		    minify: 'esbuild'
	    }
    }
});
