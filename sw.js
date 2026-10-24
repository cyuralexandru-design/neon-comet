// Neon Comet service worker: caches the whole game on first visit so it runs fully offline.
// To ship an update: change VERSION, commit, push. Players get the new version on their next launch.
const VERSION = 'neon-comet-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './fonts/fonts.css',
  './fonts/ChakraPetch-500-latin.woff2',
  './fonts/ChakraPetch-500-latin-ext.woff2',
  './fonts/ChakraPetch-700-latin.woff2',
  './fonts/ChakraPetch-700-latin-ext.woff2',
  './fonts/JetBrainsMono-400-latin.woff2',
  './fonts/JetBrainsMono-400-latin-ext.woff2',
  './fonts/JetBrainsMono-700-latin.woff2',
  './fonts/JetBrainsMono-700-latin-ext.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Page: network first (gets updates when online), cache as fallback (offline).
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else: cache first.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
