// ═══════════════════════════════════════════════════════════════════
// Blue Links Service Worker
// ─────────────────────────────────────────────────────────────────
// Caches app shell and critical resources for offline support.
// Uses "Cache First" strategy for static assets and
// "Network First" for dynamic content.
// ═══════════════════════════════════════════════════════════════════

const CACHE_NAME = 'blue-links-v2';
const RUNTIME_CACHE = 'blue-links-runtime-v1';

// ── Resources to pre-cache during SW installation ────────────────
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  // External CDN resources (optional - may not cache due to CORS)
  'https://cdn.tailwindcss.com?plugins=forms,container-queries',
  'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js',
  'https://fonts.googleapis.com/css2?family=Manrope:wght@200;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
  // App icons
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  // Screenshots (if available)
  '/screenshots/home.png'
];

// ═══════════════════════════════════════════════════════════════════
// INSTALL EVENT — Pre-cache critical app shell resources
// ═══════════════════════════════════════════════════════════════════
self.addEventListener('install', (event) => {
  console.log('[Blue Links SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Blue Links SW] Pre-caching app shell');
        
        // Attempt to cache all resources, but don't fail if some fail
        return Promise.allSettled(
          PRECACHE_URLS.map(url => {
            return cache.add(url).catch(error => {
              console.warn(`[Blue Links SW] Failed to cache: ${url}`, error);
            });
          })
        );
      })
      .then(() => {
        console.log('[Blue Links SW] Skip waiting on install');
        return self.skipWaiting();
      })
  );
});

// ═══════════════════════════════════════════════════════════════════
// ACTIVATE EVENT — Clean up old caches
// ═══════════════════════════════════════════════════════════════════
self.addEventListener('activate', (event) => {
  console.log('[Blue Links SW] Activating...');
  
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[Blue Links SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Blue Links SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// ═══════════════════════════════════════════════════════════════════
// FETCH EVENT — Network-first for API calls, cache-first for assets
// ═══════════════════════════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ── Skip non-GET requests ─────────────────────────────────────
  if (request.method !== 'GET') return;

  // ── Skip browser extensions and chrome-extension requests ─────
  if (url.protocol === 'chrome-extension:') return;

  // ── Strategy: Network First for Google Photos/Images ──────────
  if (url.hostname === 'lh3.googleusercontent.com') {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // ── Strategy: Cache First for static assets and CDN libs ─────
  if (
    url.hostname === 'cdn.tailwindcss.com' ||
    url.hostname === 'ajax.googleapis.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // ── Strategy: Network First for dynamic content (API calls, etc.)
  event.respondWith(networkFirstStrategy(request));
});

// ═══════════════════════════════════════════════════════════════════
// CACHE FIRST STRATEGY
// ─────────────────────────────────────────────────────────────────
// Check cache first, fallback to network.
// Update cache with new network responses for next time.
// ═══════════════════════════════════════════════════════════════════
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Return cached version immediately
    // In background, fetch and update cache (stale-while-revalidate)
    updateCache(request);
    return cachedResponse;
  }

  // Not in cache, get from network
  try {
    const networkResponse = await fetch(request);
    
    // Cache the new response if valid
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Blue Links SW] Fetch failed:', error);
    
    // Return a custom offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    // For other resources, return a basic error response
    return new Response('Network error', { status: 408 });
  }
}

// ═══════════════════════════════════════════════════════════════════
// NETWORK FIRST STRATEGY
// ─────────────────────────────────────────────────────────────────
// Try network first, fallback to cache if offline.
// ═══════════════════════════════════════════════════════════════════
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses for runtime
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Blue Links SW] Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If all fails and it's a navigation, show offline page
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    // Return error response
    return new Response(JSON.stringify({ 
      error: 'You are offline',
      message: 'Please check your internet connection and try again.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY: Update cache in background (stale-while-revalidate)
// ═══════════════════════════════════════════════════════════════════
async function updateCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    console.warn('[Blue Links SW] Background update failed:', error);
  }
}