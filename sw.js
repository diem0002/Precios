const CACHE_NAME = 'bodegas-ui-' + new Date().toISOString().slice(0,10); // Cache diario solo para UI

const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/main.js',
  '/js/sw-register.js',
  '/img/icon.png',
  '/img/icon-192.png'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Forzar actualización
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  // Nunca cachear datos dinámicos
  if (event.request.url.includes('spreadsheets')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para otros recursos, usar estrategia Cache First
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Limpiar caches viejos
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