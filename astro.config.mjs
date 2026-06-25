// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import { VitePWA } from 'vite-plugin-pwa';
import { generateSW } from 'workbox-build';
import { resolve } from 'node:path';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [
      tailwindcss(),
      VitePWA({
        strategies: 'generateSW',
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        devOptions: {
          enabled: true
        },
        filename: 'sw.js',
        injectManifest: {
          swSrc: 'src/sw.ts'
        },
        manifest: {
          name: 'Sismo VE',
          short_name: 'Sismo VE',
          description:
            'PWA offline de protocolos sísmicos para Venezuela, con contactos y checklist de emergencia.',
          theme_color: '#ffff00',
          background_color: '#131313',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          lang: 'es-VE',
          icons: [
            {
              src: '/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ]
  },
  integrations: [
    preact(),
    {
      name: 'workbox-sw',
      hooks: {
        'astro:build:done': async ({ logger }) => {
          const outDir = resolve(process.cwd(), 'dist');
          logger.info(`[workbox-sw] generando service worker en ${outDir}`);
          const result = await generateSW({
            globDirectory: outDir,
            globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest,woff,woff2}'],
            swDest: resolve(outDir, 'sw.js'),
            cleanupOutdatedCaches: true,
            clientsClaim: true,
            skipWaiting: true,
            directoryIndex: 'index.html',
            sourcemap: false
          });
          logger.info(`[workbox-sw] SW generado: ${result.filePaths.join(', ')}`);
        }
      }
    }
  ]
});
