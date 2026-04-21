// The Moderator — Service Worker
// Strategy: network-first for HTML, cache-first for hashed assets, network-only for APIs
const CACHE_VERSION = 'mod-v3';
const STATIC_CACHE = CACHE_VERSION + '-static';
const SHELL_CACHE = CACHE_VERSION + '-shell';

// Hashed Vite assets are immutable — safe to cache forever
function isHashedAsset(url) {
  return url.pathname.startsWith('/assets/');
}

// Navigation requests (HTML pages)
function isNavigation(request) {
  return request.mode === 'navigate';
}

// API and real-time calls — never cache
function isAPI(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('stripe') ||
    url.hostname.includes('groq') ||
    url.hostname.includes('anthropic') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('cloudflare')
  );
}

// Google Fonts — cache for performance
function isFont(url) {
  return (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  );
}

// Install: activate immediately
self.addEventListener('install', (event) => {
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      );
    })
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// Fetch: route requests to the right strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // API / real-time: network only, never cache
  if (isAPI(url)) return;

  // Hashed static assets: cache-first (immutable files)
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // Fonts: cache-first
  if (isFont(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // HTML navigation: always go to network, never cache
  // CSP headers live on the HTML response — caching HTML means caching stale security policy.
  // Offline fallback isn't useful for a live debate app (you need internet to debate).
  if (isNavigation(event.request)) return;

  // Icons, images, other same-origin assets: network-first with cache fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
});
