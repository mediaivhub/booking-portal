// Intentionally does no caching — this app shows live, frequently-changing
// booking data, and a caching layer risks serving nurses/admin stale data.
// This exists solely so Chrome's PWA installability check (which requires a
// registered service worker with a fetch handler) passes, enabling the
// "Add to Home Screen" / install prompt on Android.

// Public key only (safe to embed) — used to re-subscribe from pushsubscriptionchange below,
// where no page is open to supply it. Keep in sync with NEXT_PUBLIC_VAPID_PUBLIC_KEY.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
const VAPID_PUBLIC_KEY_FALLBACK = urlBase64ToUint8Array(
  "BFb3tvxqnxIaupbbr2asSznS8Rvk9OBCXWNExUXnfl2wDkzpBlQamczILuOwJ0QifWH5CqzqGMkV3gRoPIbxYHs"
);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icon.png",
        badge: "/icon.png",
        data: { url: data.url || "/" },
      }),
      // The red circle on the home-screen icon. Not supported everywhere (no-op if so).
      self.registration.setAppBadge?.(1)?.catch(() => {}),
    ])
  );
});

// The browser/OS can silently rotate a push subscription (token refresh, OS update,
// re-enabling background push after it was suspended, etc.) without the page being open
// to notice. Without this handler, the server keeps sending to the now-dead old endpoint
// forever — it looks "subscribed" but nothing ever arrives, and the only fix used to be
// manually toggling notifications off/on to force a fresh subscribe.
self.addEventListener("pushsubscriptionchange", (event) => {
  const oldEndpoint = event.oldSubscription?.endpoint;
  const applicationServerKey =
    event.oldSubscription?.options?.applicationServerKey || VAPID_PUBLIC_KEY_FALLBACK;

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey })
      .then((sub) =>
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(sub.toJSON()),
        }).then(() => {
          if (oldEndpoint && oldEndpoint !== sub.endpoint) {
            return fetch("/api/push/subscribe", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ endpoint: oldEndpoint }),
            });
          }
        })
      )
      .catch(() => {
        // Nothing we can do without a page open to re-prompt for permission if this fails.
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  self.registration.clearAppBadge?.()?.catch(() => {});
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
