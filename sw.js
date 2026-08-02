/* Сборка: 20260802 */
/* Service Worker для установки веб-приложения «Гран-при 26».
   Он не сохраняет пользовательские данные и не кэширует results.json. */

self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // Обычная загрузка из сети без скрытого сохранения или изменения ответа.
  event.respondWith(fetch(event.request));
});
