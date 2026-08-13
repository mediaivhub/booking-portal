// Intentionally does no caching — this app shows live, frequently-changing
// booking data, and a caching layer risks serving nurses/admin stale data.
// This exists solely so Chrome's PWA installability check (which requires a
// registered service worker with a fetch handler) passes, enabling the
// "Add to Home Screen" / install prompt on Android.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
