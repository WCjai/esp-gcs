// sw.js

const CACHE_NAME = 'tiles-cache-v1';

// Listen to the install event and immediately take control
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Intercept fetch events
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Only handle tile requests (adjust the condition if needed)
  if (request.url.includes('/tiles/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          // If found in cache, return it immediately.
          if (cachedResponse) {
            return cachedResponse;
          }
          // Otherwise, fetch from the network, cache it, then return it.
          return fetch(request).then((networkResponse) => {
            // Only cache valid responses (status 200)
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
  }
  // For non-tile requests, do nothing.
});
