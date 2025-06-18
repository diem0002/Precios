const CACHE_NAME = 'bodegas-ui-v3';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/main.js',
  './js/sw-register.js',
  './img/icon.png',
  './img/icon-192.png',
  './404.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS);
      })
  );
});

self.addEventListener('fetch', event => {
  // No cachear la hoja de cálculo
  if (event.request.url.includes('spreadsheets')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request)
          .then(fetchResponse => {
            // Cachear solo assets estáticos
            if (ASSETS.some(asset => event.request.url.includes(asset))) {
              const responseClone = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone));
            }
            return fetchResponse;
          });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
                 .map(name => caches.delete(name))
      );
    })
  );
});