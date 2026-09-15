/// <reference lib="webworker" />
// Custom service worker (injectManifest). Precache + /data caching preserve
// the exact behavior of the previous generateSW config; push handlers are new.
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
self.addEventListener("activate", () => void self.clients.claim());

registerRoute(
  ({ url }) => url.pathname.startsWith("/data/"),
  new CacheFirst({
    cacheName: "quran-data",
    plugins: [new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

self.addEventListener("push", (event) => {
  let payload: { title?: string; body?: string; url?: string } = {};
  try { payload = event.data?.json() ?? {}; } catch { /* non-JSON push — show default */ }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "MindfulVerse", {
      body: payload.body ?? "Today's verse is waiting for you.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url ?? "/checkin" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? "/checkin";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => "focus" in c);
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
