// Service Worker for Yanuh Memorial PWA
const CACHE_NAME = 'yanuh-memorial-v2'; // Updated version
const urlsToCache = [
  '/index.html',
  '/admin.html',
  '/login.html',
  '/person.html',
  '/stats.html',
  '/script.js',
  '/admin.js',
  '/login.js',
  '/person.js',
  '/stats.js',
  '/icon.png'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('SW: Cache failed:', err))
  );
  self.skipWaiting(); // Activate immediately
});

// Fetch event - ONLY handle local files
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // IGNORE completely if it's:
  // 1. Supabase API
  // 2. External CDN
  // 3. Chrome extension
  // 4. Not a GET request
  // 5. Not same origin (except for specific allowed domains)
  const shouldIgnore = 
    url.hostname.includes('supabase.co') || 
    url.hostname.includes('cdn.') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.protocol === 'chrome-extension:' ||
    event.request.method !== 'GET';
  
  if (shouldIgnore) {
    // CRITICAL: Don't call event.respondWith - just return
    return;
  }
  
  // Only for local files from our domain
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('SW: Serving from cache:', event.request.url);
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        console.log('SW: Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // Only cache successful responses for same-origin requests
            if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(error => {
            console.error('SW: Fetch failed:', error);
            return new Response('Offline - resource not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
