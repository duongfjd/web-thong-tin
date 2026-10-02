/* Personal OS — Service Worker (minimal, cache-first for shell) */
const CACHE = 'personal-os-v1';
const SHELL = [
  './',
  './index.html',
  './css/tokens.css',
  './css/layout.css',
  './css/components.css',
  './js/db.js',
  './js/utils.js',
  './js/auth.js',
  './js/router.js',
  './js/main.js',
  './js/modules/dashboard.js',
  './js/modules/timesheet.js',
  './js/modules/expenses.js',
  './js/modules/bookmarks.js',
  './js/modules/vault.js',
  './js/modules/clipboard.js',
  './js/modules/settings.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Only intercept GET requests to same origin
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
