// Bump this version whenever caching strategy changes — old caches are purged on activate.
const CACHE_NAME = "agentic-os-v2";
const STATIC_ASSETS = ["/", "/index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = request.url;

  // API calls — network only, with an offline JSON fallback.
  if (url.includes("/api/")) {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "Offline — API unavailable" }), {
          headers: { "content-type": "application/json" },
        })
      )
    );
    return;
  }

  // Navigation / HTML documents — NETWORK-FIRST.
  // This guarantees index.html is always fresh, so it references the latest
  // hashed JS bundle. Falling back to cache only when offline. (Cache-first
  // here was the bug: a stale index.html pointed at an old crashed bundle.)
  if (request.mode === "navigate" || request.destination === "document") {
    e.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put("/index.html", copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match("/index.html").then((c) => c || caches.match("/")))
    );
    return;
  }

  // Hashed static assets (JS/CSS with content hashes) are immutable — cache-first is safe.
  e.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
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
