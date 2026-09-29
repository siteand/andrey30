/* Сборка: 20260929-images-v1 */
/* «Гран-при 26»: быстрый повторный показ фотографий, флагов и иконок.
   HTML и results.json загружаются обычным способом, без Cache Storage. */

const ASSET_BASE_PATH = new URL('./', self.location.href).pathname;
const IMAGE_CACHE_PREFIX = 'granpri26-images:' + ASSET_BASE_PATH + ':';
const IMAGE_CACHE_NAME = IMAGE_CACHE_PREFIX + 'v1';
const IMAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CACHED_AT_HEADER = 'X-Granpri26-Cached-At';
const pendingImages = new Map();

self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
  event.waitUntil((async function() {
    try {
      const names = await caches.keys();
      await Promise.all(names
        .filter(name => name.startsWith(IMAGE_CACHE_PREFIX) && name !== IMAGE_CACHE_NAME)
        .map(name => caches.delete(name)));
    } catch (error) {
      // Ограничение хранилища не должно мешать работе сайта.
    }
    await self.clients.claim();
  })());
});

function fetchAndStoreImage(request, revalidate) {
  const key = request.url;
  if (!pendingImages.has(key)) {
    const operation = (async function() {
      const networkRequest = revalidate ? new Request(request, { cache: 'no-cache' }) : request;
      const response = await fetch(networkRequest);
      const type = response.headers.get('Content-Type') || '';
      if (response.status === 200 && type.toLowerCase().startsWith('image/')) {
        try {
          const cache = await caches.open(IMAGE_CACHE_NAME);
          const headers = new Headers(response.headers);
          headers.set(CACHED_AT_HEADER, String(Date.now()));
          const stored = new Response(response.clone().body, {
            status: response.status,
            statusText: response.statusText,
            headers
          });
          await cache.put(request, stored);
        } catch (error) {
          // Даже если кеш недоступен или заполнен, возвращаем полученную картинку.
        }
      }
      return response;
    })();
    pendingImages.set(key, operation.finally(() => pendingImages.delete(key)));
  }
  return pendingImages.get(key).then(response => response.clone());
}

async function serveImage(request) {
  let cached = null;
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    cached = await cache.match(request);
  } catch (error) {}

  const forceRefresh = request.cache === 'reload' || request.cache === 'no-cache';
  if (cached && !forceRefresh) {
    const savedAt = Number(cached.headers.get(CACHED_AT_HEADER));
    const expired = !savedAt || Date.now() - savedAt >= IMAGE_MAX_AGE_MS;
    // Сразу показываем сохранённое; раз в сутки проверяем обновления в фоне.
    return {
      response: cached,
      background: expired ? fetchAndStoreImage(request, true).catch(() => {}) : undefined
    };
  }

  try {
    const response = await fetchAndStoreImage(request, forceRefresh);
    return { response: response.ok || !cached ? response : cached };
  } catch (error) {
    if (cached) return { response: cached };
    throw error;
  }
}

self.addEventListener('fetch', function(event) {
  const request = event.request;
  if (request.method !== 'GET' || request.destination !== 'image') return;
  if (request.cache === 'no-store' || request.headers.has('Range')) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(ASSET_BASE_PATH)) return;
  const relativePath = url.pathname.slice(ASSET_BASE_PATH.length);
  if (!/^(photos|flags|icons)\//.test(relativePath)) return;

  const task = serveImage(request);
  event.respondWith(task.then(result => result.response));
  // Продлеваем жизнь worker до завершения записи и фоновой проверки.
  event.waitUntil(task.then(result => result.background).catch(() => {}));
});
