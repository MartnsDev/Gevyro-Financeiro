// Never cache financial documents, API responses, auth tokens or HTML.
const CACHE = 'gevyro-static-v2';
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(['/icon-192.png'])));
  self.skipWaiting();
});
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('gevyro-static-') && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname !== '/icon-192.png'
  )
    return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
