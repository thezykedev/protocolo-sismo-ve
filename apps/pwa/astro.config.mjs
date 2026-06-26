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

const isRuntimeAsset = (filePath) =>
  /\.(?:js|css|svg|png|ico|json|webmanifest)$/i.test(filePath);

const buildRouteEntries = (assets) =>
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
    });

const buildServiceWorker = (cacheName, routeEntries) => {
  const routeAliases = JSON.stringify(routeEntries, null, 2);

  return `const CACHE_NAME = '${cacheName}';
const ROUTE_ALIASES = ${routeAliases};

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
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
        const fallback = await cache.match('/') || await cache.match('/index.html');
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
          const packageInfo = JSON.parse(
            await readFile(resolve(process.cwd(), 'package.json'), 'utf8')
          );
          const shortCommit = (process.env.SOURCE_COMMIT ?? 'local').trim().slice(0, 7) || 'local';
          const cacheVersion = `${packageInfo.version}-${shortCommit}`.replace(/[^a-zA-Z0-9.-]/g, '-');
          const cacheName = `sismo-ve-${cacheVersion}`;
          const allFiles = await walk(outDir);
          const assets = allFiles
            .filter((filePath) => /\.(?:html|js|css|svg|png|ico|json|webmanifest)$/i.test(filePath))
            .map((filePath) => `/${posix.relative(outDir, filePath)}`.replaceAll('//', '/'))
            .sort();
          const routeEntries = buildRouteEntries(assets);
          const routeSources = routeEntries.map((entry) => entry.source);
          const runtimeAssets = assets.filter(
            (asset) => isRuntimeAsset(asset) && !routeSources.includes(asset)
          );
          const offlineManifest = {
            version: cacheVersion,
            cacheName,
            routes: routeEntries,
            assets: runtimeAssets
          };
          const swPath = resolve(outDir, 'sw.js');
          const manifestPath = resolve(outDir, 'offline-manifest.json');

          await writeFile(swPath, buildServiceWorker(cacheName, routeEntries), 'utf8');
          await writeFile(manifestPath, JSON.stringify(offlineManifest, null, 2), 'utf8');
          logger.info(`[static-pwa-sw] SW generado: ${swPath}`);
          logger.info(`[static-pwa-sw] Manifest generado: ${manifestPath}`);
        }
      }
    }
  ]
});
