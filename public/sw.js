const CACHE_NAME = "agentic-os-v1";
const STATIC_ASSETS = ["/", "/index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Network-first for API calls, cache-first for static
  if (e.request.url.includes("/api/")) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: "Offline — API unavailable" }), {
          headers: { "content-type": "application/json" }
        })
      )
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Push notifications support
self.addEventListener("push", (e) => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || "AgenticOS", {
      body: data.body || "Flow completed",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: data,
    })
  );
});
