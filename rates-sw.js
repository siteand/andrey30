const VERSION = 'rates-offline-v13';
const page = new URL(self.location.href).searchParams.get('page') || new URL('rates.html', self.location.href).pathname;
const CACHE = VERSION + ':' + page;
const base = new URL('./', self.location.href);
const asset = name => new URL(name, base).href;
self.addEventListener('message', event => {
    if (!event.data || event.data.type !== 'cache-flags' || !Array.isArray(event.data.urls)) return;
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        const urls = event.data.urls.filter(value => {
            try { const url = new URL(value); return url.origin === base.origin && url.pathname.startsWith(base.pathname + 'flags/'); } catch { return false; }
        });
        await Promise.allSettled(urls.map(url => cache.add(url)));
    })());
});
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        await cache.addAll([page, asset('rates.webmanifest'), ...[16,32,180,192,512].map(size => asset(`icons3/rates-icon-${size}.png`)), asset('privacy.html')]);
        await self.skipWaiting();
    })());
});
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith('rates-offline-') && key.endsWith(':' + page) && key !== CACHE).map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== base.origin) return;
    const isPage = url.pathname === page;
    const isAsset = url.pathname.startsWith(base.pathname + 'flags/') || ['rates.webmanifest', ...[16,32,180,192,512].map(size => `icons3/rates-icon-${size}.png`), 'privacy.html'].some(name => url.pathname === new URL(name, base).pathname);
    if (!isPage && !isAsset) return;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const key = isPage ? page : event.request;
        try {
            const response = await fetch(event.request);
            if (response.ok) { await cache.put(key, response.clone()); return response; }
            return await cache.match(key) || response;
        } catch (error) {
            const saved = await cache.match(key);
            if (saved) return saved;
            throw error;
        }
    })());
});
