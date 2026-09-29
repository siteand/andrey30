/* «Форекс часы»: установка и работа без сети. Сборка 20260929-v1. */
'use strict';

const BASE_URL = new URL('./', self.location.href);
const PAGE_URL = new URL('fxc.html', BASE_URL).href;
const PAGE_PATH = new URL(PAGE_URL).pathname;
const CACHE_PREFIX = 'fxc-offline:' + BASE_URL.pathname + ':';
const CACHE_NAME = CACHE_PREFIX + '20260929-v1';

const CORE = [
  'fxc.html'
].map(path => new URL(path, BASE_URL).href);

const ASSETS = [
  'fxc.webmanifest',
  'privacy.html',
  'images/fxc-192.png',
  'images/fxc-512.png',
  'flags/au.png',
  'flags/jp.png',
  'flags/de.png',
  'flags/gb.png',
  'flags/us.png'
].map(path => new URL(path, BASE_URL).href);

const MANAGED_URLS = new Set([...CORE, ...ASSETS]);

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

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    await Promise.all(CORE.map(async url => {
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error('Не удалось сохранить ' + url);
      await cache.put(url, response);
    }));

    await Promise.allSettled(ASSETS.map(async url => {
      const response = await fetchWithTimeout(url);
      if (response.ok) await cache.put(url, response);
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();

    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));

    await self.clients.claim();
  })());
});

async function servePage(request) {
  let cache;
  let cached;

  try {
    cache = await caches.open(CACHE_NAME);
    cached = await cache.match(PAGE_URL);
  } catch (error) {}

  try {
    const response = await fetchWithTimeout(request, 3500);

    if (response.ok) {
      if (cache) {
        try {
          await cache.put(PAGE_URL, response.clone());
        } catch (error) {}
      }
      return response;
    }

    return cached || response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

async function serveAsset(request, key) {
  let cache;

  try {
    cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(key);
    if (cached) return cached;
  } catch (error) {}

  const response = await fetch(request);

  if (response.ok && cache) {
    try {
      await cache.put(key, response.clone());
    } catch (error) {}
  }

  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('Range')) return;

  const url = new URL(request.url);
  if (url.origin !== BASE_URL.origin) return;

  if (request.mode === 'navigate') {
    if (url.pathname === PAGE_PATH) event.respondWith(servePage(request));
    return;
  }

  const key = url.origin + url.pathname;
  if (MANAGED_URLS.has(key)) event.respondWith(serveAsset(request, key));
});
