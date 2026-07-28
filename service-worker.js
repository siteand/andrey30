const CACHE_PREFIX = "trading-journal-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v23`;

const JOURNAL_URL = new URL("./journal.html", self.location.href).href;
const APP_SHELL = [
  JOURNAL_URL,
  new URL("./journal.webmanifest", self.location.href).href,
  new URL("./journal-icons/journal-icon-192.png", self.location.href).href,
  new URL("./journal-icons/journal-icon-512.png", self.location.href).href
];
const MANAGED_PATHS = new Set(APP_SHELL.map((item) => {
  const url = new URL(item);
  return url.origin + url.pathname;
}));
const JOURNAL_PATH = new URL(JOURNAL_URL).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Even if an older registration has a broad scope, never intercept other site pages.
  if (event.request.mode === "navigate") {
    if (url.pathname !== JOURNAL_PATH) return;

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(JOURNAL_URL, copy));
          }
          return response;
        })
        .catch(() => caches.match(JOURNAL_URL))
    );
    return;
  }

  const normalizedPath = url.origin + url.pathname;
  if (!MANAGED_PATHS.has(normalizedPath)) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
