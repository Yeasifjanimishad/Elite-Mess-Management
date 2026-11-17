const CACHE_NAME = 'mms-pwa-cache-v1';
const ASSETS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json'
];

// Install: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching core PWA shell');
        return cache.addAll(ASSETS_TO_PRECACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Prune outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting legacy cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch dispatcher
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // 1. Navigation & Page requests (Network-First with offline fallback)
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', responseCopy));
          return response;
        })
        .catch(() => {
          // If offline, return the cached / index shell immediately
          return caches.match('/');
        })
    );
    return;
  }

  // 2. Static Assets: JS, CSS, SVG, manifest, fonts (Stale-While-Revalidate)
  const isStatic = url.pathname.includes('/assets/') || 
                   url.pathname.endsWith('.js') || 
                   url.pathname.endsWith('.css') || 
                   url.pathname.endsWith('.svg') || 
                   url.pathname.endsWith('.json') ||
                   url.host.includes('googleapis') ||
                   url.host.includes('gstatic');

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseCopy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
            }
            return networkResponse;
          })
          .catch(() => {
            // Silence network exception, return cached copy if available
          });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. Dynamic requests (Network-First)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
