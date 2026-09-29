/* Конвертер валют: офлайн-режим. Сборка 20260929-v1. */
/* Отдельная область действия: только currencyconvener.html.
   Курсы хранятся самой страницей; сетевые ответы API здесь не кэшируются. */
'use strict';

const BASE_URL = new URL('./', self.location.href);
const PAGE_URL = new URL('currencyconvener.html', BASE_URL).href;
const PAGE_PATH = new URL(PAGE_URL).pathname;
const CACHE_PREFIX = 'currency-offline:' + BASE_URL.pathname + ':';
const CACHE_NAME = CACHE_PREFIX + '20260929-v1';
const CORE = ['currencyconvener.html', 'currency.webmanifest'].map(path => new URL(path, BASE_URL).href);
const ASSETS = [
    "flags/ae.png",
    "flags/am.png",
    "flags/ar.png",
    "flags/au.png",
    "flags/az.png",
    "flags/bd.png",
    "flags/bg.png",
    "flags/bh.png",
    "flags/br.png",
    "flags/by.png",
    "flags/ca.png",
    "flags/ch.png",
    "flags/cl.png",
    "flags/cn.png",
    "flags/co.png",
    "flags/cz.png",
    "flags/dk.png",
    "flags/eg.png",
    "flags/eu.png",
    "flags/gb.png",
    "flags/ge.png",
    "flags/hk.png",
    "flags/hu.png",
    "flags/id.png",
    "flags/il.png",
    "flags/in.png",
    "flags/jo.png",
    "flags/jp.png",
    "flags/kg.png",
    "flags/kr.png",
    "flags/kw.png",
    "flags/kz.png",
    "flags/lk.png",
    "flags/md.png",
    "flags/mx.png",
    "flags/my.png",
    "flags/ng.png",
    "flags/no.png",
    "flags/nz.png",
    "flags/om.png",
    "flags/pe.png",
    "flags/ph.png",
    "flags/pk.png",
    "flags/pl.png",
    "flags/qa.png",
    "flags/ro.png",
    "flags/rs.png",
    "flags/ru.png",
    "flags/sa.png",
    "flags/se.png",
    "flags/sg.png",
    "flags/th.png",
    "flags/tj.png",
    "flags/tm.png",
    "flags/tr.png",
    "flags/tw.png",
    "flags/ua.png",
    "flags/us.png",
    "flags/uz.png",
    "flags/vn.png",
    "flags/za.png",
    "icons2/favicon-16.png",
    "icons2/favicon-32.png",
    "icons2/apple-touch-icon.png",
    "icons2/icon-192.png",
    "icons2/icon-512.png"
].map(path => new URL(path, BASE_URL).href);
const MANAGED_URLS = new Set([...CORE, ...ASSETS]);

async function fetchWithTimeout(request, timeout = 6000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        return await fetch(request, { signal: controller.signal, cache: 'no-cache' });
    } finally {
        clearTimeout(timer);
    }
}

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        // The page and manifest must both be saved before offline readiness is shown.
        await Promise.all(CORE.map(async url => {
            const response = await fetchWithTimeout(url);
            if (!response.ok) throw new Error('Cannot save ' + url);
            await cache.put(url, response);
        }));
        // A missing flag or icon must not prevent the calculator from opening offline.
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
        await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

async function servePage(request) {
    let cache, cached;
    try {
        cache = await caches.open(CACHE_NAME);
        cached = await cache.match(PAGE_URL);
    } catch (error) {}
    try {
        const response = await fetchWithTimeout(request, 3500);
        if (response.ok) {
            if (cache) {
                try { await cache.put(PAGE_URL, response.clone()); } catch (error) {}
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
        try { await cache.put(key, response.clone()); } catch (error) {}
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
