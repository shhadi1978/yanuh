// Service Worker for Yanuh Memorial PWA
const CACHE_NAME = 'yanuh-memorial-v1';
const urlsToCache = [
  '/',
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
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
