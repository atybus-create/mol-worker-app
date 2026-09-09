const VERSION = "mol-pwa-test-20260909.3";
const SHELL = [
  "./",
  "./offline.html",
  "./manifest.webmanifest",
  "./pwa-register.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./mobile/index.html",
  "./mobile/login.html",
  "./web/index.html",
  "./web/login.html",
  "./shared/api.js",
  "./shared/auth.js",
  "./shared/auth.css",
  "./shared/brand.js",
  "./shared/processes.js",
  "./shared/roles.js",
  "./shared/states.css",
  "./shared/tokens.css",
  "./shared/warehouse-tools.js",
  "./mobile/app.css",
  "./mobile/app.js",
  "./mobile/live-actions.js",
  "./mobile/live.js",
  "./mobile/manager.css",
  "./mobile/manager.js",
  "./mobile/report-integrity.js",
  "./mobile/spec-completion.css",
  "./mobile/spec-completion.js",
  "./mobile/worker-details.css",
  "./mobile/worker-details.js",
  "./web/app.css",
  "./web/app.js",
  "./web/details.css",
  "./web/details.js",
  "./web/leader-message-history.js",
  "./web/leader-messages.css",
  "./web/leader-messages.js",
  "./web/live-actions.js",
  "./web/live.js",
  "./web/spec-completion.css",
  "./web/spec-completion.js",
  "./web/weighted-report.js",
  "./web/worktime-completion.js",
  "./web/worktime.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("mol-pwa-test-") && key !== VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const scopePath = new URL(self.registration.scope).pathname;

  if (url.origin !== self.location.origin || !url.pathname.startsWith(scopePath)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request, {ignoreSearch: true})) || (await caches.match("./offline.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request, {ignoreSearch: true}).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && url.pathname.startsWith(scopePath)) {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
