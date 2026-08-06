/* Ružini domaći kolači — Service Worker (push + osnovni offline) */

const CACHE = "rdk-v1";
const APP_SHELL = ["/", "/offline", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Mreža-prvo za navigaciju, uz offline fallback
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/offline").then((r) => r || caches.match("/")))
    );
  }
});

// Prijem push poruke → prikaži notifikaciju (zvuk + tekst, mora se reagovati)
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "Podsetnik", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "🌹 Podsetnik za porudžbinu";
  const options = {
    body: payload.body || "Imaš porudžbinu koja se bliži isporuci.",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: payload.tag || "rdk-reminder",
    renotify: true,
    requireInteraction: true, // ostaje dok korisnik ne reaguje
    vibrate: [200, 100, 200, 100, 200],
    data: { url: payload.url || "/" },
    actions: [{ action: "otvori", title: "Otvori" }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
