/* Сборка: 20260930-offline-v1 */
/* «Гран-при 26»: работа без сети, свежие результаты онлайн и сохранённые изображения. */
'use strict';

const BASE_URL = new URL('./', self.location.href);
const BASE_PATH = BASE_URL.pathname;
const PAGE_URL = new URL('granpri26.html', BASE_URL).href;
const PAGE_PATH = new URL(PAGE_URL).pathname;

const OFFLINE_CACHE_PREFIX = 'granpri26-offline:' + BASE_PATH + ':';
const OFFLINE_CACHE_NAME = OFFLINE_CACHE_PREFIX + '20260930-v1';
const IMAGE_CACHE_PREFIX = 'granpri26-images:' + BASE_PATH + ':';
const IMAGE_CACHE_NAME = IMAGE_CACHE_PREFIX + 'v2';

const IMAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CACHED_AT_HEADER = 'X-Granpri26-Cached-At';
const pendingImages = new Map();

const OFFLINE_ASSETS = [
  'site.webmanifest',
  'privacy.html'
].map(path => new URL(path, BASE_URL).href);

const RESULTS_URLS = [
  new URL('results.json', BASE_URL).href,
  'https://raw.githubusercontent.com/siteand/andrey30/main/results.json'
];

const PRECACHE_IMAGES = [
  'icons/favicon-16.png',
  'icons/favicon-32.png',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',

  'flags/au.png', 'flags/cn.png', 'flags/jp.png', 'flags/bh.png',
  'flags/sa.png', 'flags/us.png', 'flags/ca.png', 'flags/mc.png',
  'flags/es.png', 'flags/at.png', 'flags/gb.png', 'flags/be.png',
  'flags/hu.png', 'flags/nl.png', 'flags/it.png', 'flags/az.png',
  'flags/sg.png', 'flags/mx.png', 'flags/br.png', 'flags/qa.png',
  'flags/ae.png', 'flags/fr.png', 'flags/th.png', 'flags/ar.png',
  'flags/fi.png', 'flags/de.png', 'flags/nz.png', 'flags/se.png',

  'photos/teams/mclaren/logo.png',
  'photos/teams/redbull/logo.png',
  'photos/teams/ferrari/logo.png',
  'photos/teams/mercedes/logo.png',
  'photos/teams/astonmartin/logo.png',
  'photos/teams/alpine/logo.png',
  'photos/teams/racingbulls/logo.png',
  'photos/teams/haas/logo.png',
  'photos/teams/williams/logo.png',
  'photos/teams/audi/logo.png',
  'photos/teams/cadillac/logo.png'
].map(path => new URL(path, BASE_URL).href);

function normalizedUrl(value) {
  const url = new URL(typeof value === 'string' ? value : value.url);
  return url.origin + url.pathname;
}

const OFFLINE_ASSET_KEYS = new Set(OFFLINE_ASSETS.map(normalizedUrl));
const RESULTS_KEYS = new Set(RESULTS_URLS.map(normalizedUrl));

async function fetchWithTimeout(request, timeout = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(request, {
      signal: controller.signal,
      cache: 'no-cache'
    });
  } finally {
    clearTimeout(timer);
  }
}

async function putIfSuccessful(cache, key, response) {
  if (response && response.ok) await cache.put(key, response.clone());
  return response;
}

self.addEventListener('install', function(event) {
  event.waitUntil((async function() {
    const cache = await caches.open(OFFLINE_CACHE_NAME);

    const pageResponse = await fetchWithTimeout(PAGE_URL);
    if (!pageResponse.ok) throw new Error('Не удалось сохранить страницу «Гран-при 26».');
    await cache.put(PAGE_URL, pageResponse);

    await Promise.allSettled(OFFLINE_ASSETS.map(async function(url) {
      const response = await fetchWithTimeout(url);
      await putIfSuccessful(cache, normalizedUrl(url), response);
    }));

    await Promise.allSettled(RESULTS_URLS.map(async function(url) {
      const response = await fetchWithTimeout(url);
      await putIfSuccessful(cache, normalizedUrl(url), response);
    }));

    await Promise.allSettled(PRECACHE_IMAGES.map(function(url) {
      return fetchAndStoreImage(new Request(url), false);
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function(event) {
  event.waitUntil((async function() {
    try {
      const names = await caches.keys();
      await Promise.all(names
        .filter(function(name) {
          const oldOffline = name.startsWith(OFFLINE_CACHE_PREFIX) && name !== OFFLINE_CACHE_NAME;
          const oldImages = name.startsWith(IMAGE_CACHE_PREFIX) && name !== IMAGE_CACHE_NAME;
          return oldOffline || oldImages;
        })
        .map(name => caches.delete(name)));
    } catch (error) {
      // Ограничение хранилища не должно мешать открытию страницы.
    }

    await self.clients.claim();
  })());
});

async function servePage(request) {
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const cached = await cache.match(PAGE_URL);

  try {
    const response = await fetchWithTimeout(request, 3500);
    if (response.ok) {
      try {
        await cache.put(PAGE_URL, response.clone());
      } catch (error) {}
      return response;
    }
    return cached || response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

async function findSavedResults(cache, preferredKey) {
  const preferred = await cache.match(preferredKey);
  if (preferred) return preferred;

  for (const key of RESULTS_KEYS) {
    if (key === preferredKey) continue;
    const fallback = await cache.match(key);
    if (fallback) return fallback;
  }

  return undefined;
}

async function serveResults(request, key) {
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const cached = await findSavedResults(cache, key);

  try {
    const response = await fetchWithTimeout(request, 4500);
    if (response.ok) {
      try {
        await cache.put(key, response.clone());
      } catch (error) {}
      return response;
    }
    return cached || response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

async function serveOfflineAsset(request, key) {
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const cached = await cache.match(key);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    try {
      await cache.put(key, response.clone());
    } catch (error) {}
  }
  return response;
}

function fetchAndStoreImage(request, revalidate) {
  const key = normalizedUrl(request);

  if (!pendingImages.has(key)) {
    const operation = (async function() {
      const networkRequest = revalidate
        ? new Request(request, { cache: 'no-cache' })
        : request;
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
          await cache.put(key, stored);
        } catch (error) {
          // Даже если кэш недоступен или заполнен, возвращаем картинку из сети.
        }
      }

      return response;
    })();

    pendingImages.set(key, operation.finally(() => pendingImages.delete(key)));
  }

  return pendingImages.get(key).then(response => response.clone());
}

async function serveImage(request) {
  const key = normalizedUrl(request);
  let cached = null;

  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    cached = await cache.match(key);
  } catch (error) {}

  const forceRefresh = request.cache === 'reload' || request.cache === 'no-cache';

  if (cached && !forceRefresh) {
    const savedAt = Number(cached.headers.get(CACHED_AT_HEADER));
    const expired = !savedAt || Date.now() - savedAt >= IMAGE_MAX_AGE_MS;

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
  if (request.method !== 'GET' || request.headers.has('Range')) return;

  const url = new URL(request.url);
  const key = normalizedUrl(url.href);
  const sameOrigin = url.origin === BASE_URL.origin;

  if (request.mode === 'navigate' && sameOrigin && url.pathname === PAGE_PATH) {
    event.respondWith(servePage(request));
    return;
  }

  if (RESULTS_KEYS.has(key)) {
    event.respondWith(serveResults(request, key));
    return;
  }

  if (!sameOrigin || !url.pathname.startsWith(BASE_PATH)) return;

  const relativePath = url.pathname.slice(BASE_PATH.length);
  if (request.destination === 'image' && /^(photos|flags|icons)\//.test(relativePath)) {
    const task = serveImage(request);
    event.respondWith(task.then(result => result.response));
    event.waitUntil(task.then(result => result.background).catch(() => {}));
    return;
  }

  if (OFFLINE_ASSET_KEYS.has(key)) {
    event.respondWith(serveOfflineAsset(request, key));
  }
});
