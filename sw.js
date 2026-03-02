// Service Worker con estrategia mixta para SPA en GitHub Pages.
const swUrl = new URL(self.location.href);
const baseSegment = swUrl.pathname.split('/').filter(Boolean).at(0) || 'app';
const defaultCachePrefix = `${baseSegment}-`;
const cachePrefix = swUrl.searchParams.get('cachePrefix') || defaultCachePrefix;
const CACHE_NAME = `${cachePrefix}static-v1`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const scope = self.registration.scope;
      await cache.addAll([scope, `${scope}manifest.json`]);
      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const network = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, network.clone());
  return network;
};

const networkFirst = async (request) => {
  try {
    const network = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, network.clone());
    return network;
  } catch {
    return caches.match(request);
  }
};

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const destination = event.request.destination;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (destination === 'image' || destination === 'font') {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (destination === 'script' || destination === 'style') {
    event.respondWith(networkFirst(event.request));
  }
});