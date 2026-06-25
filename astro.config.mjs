// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { posix, resolve } from 'node:path';

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = posix.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(fullPath);
      }
      return [fullPath];
    })
  );

  return files.flat();
};

const isCacheableAsset = (filePath) =>
  /\.(?:html|js|css|svg|png|ico|json|webmanifest|woff2?)$/i.test(filePath);

const buildServiceWorker = (assets, version) => {
  const assetList = JSON.stringify(assets, null, 2);
  const routeAliases = JSON.stringify(
    assets
      .filter((asset) => asset.endsWith('/index.html') || asset === '/index.html')
      .map((asset) => {
        if (asset === '/index.html') {
          return { source: '/index.html', aliases: ['/', '/index.html'] };
        }

        const routePath = asset.slice(0, -'/index.html'.length);
        return {
          source: asset,
          aliases: [routePath, `${routePath}/`, asset]
        };
      }),
    null,
    2
  );

  return `const CACHE_NAME = 'sismo-ve-${version}';
const PRECACHE_URLS = ${assetList};
const ROUTE_ALIASES = ${routeAliases};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);

    for (const entry of ROUTE_ALIASES) {
      const response = await cache.match(entry.source);
      if (!response) continue;

      await Promise.all(
        entry.aliases.map((alias) => cache.put(alias, response.clone()))
      );
    }

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

const getNavigationCandidates = (url) => {
  if (url.pathname === '/') return ['/', '/index.html'];

  const normalized = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
  return [normalized, \`\${normalized}/\`, \`\${normalized}/index.html\`, '/index.html'];
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      for (const candidate of getNavigationCandidates(url)) {
        const cached = await cache.match(candidate);
        if (cached) return cached;
      }

      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const fallback = await cache.match('/index.html');
        if (fallback) return fallback;
        throw new Error('Offline navigation failed');
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok && url.origin === self.location.origin) {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
`;
};

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [
    preact(),
    {
      name: 'static-pwa-sw',
      hooks: {
        'astro:build:done': async ({ logger }) => {
          const outDir = resolve(process.cwd(), 'dist');
          const allFiles = await walk(outDir);
          const assets = allFiles
            .filter((filePath) => isCacheableAsset(filePath))
            .map((filePath) => `/${posix.relative(outDir, filePath)}`.replaceAll('//', '/'))
            .sort();
          const swPath = resolve(outDir, 'sw.js');
          const indexHtml = await readFile(resolve(outDir, 'index.html'), 'utf8');
          const version = Date.now().toString(36);

          await writeFile(swPath, buildServiceWorker(assets, version), 'utf8');
          logger.info(`[static-pwa-sw] SW generado: ${swPath}`);

          if (!indexHtml.includes('/manifest.webmanifest')) {
            logger.warn('[static-pwa-sw] manifest.webmanifest no esta referenciado en index.html');
          }
        }
      }
    }
  ]
});
