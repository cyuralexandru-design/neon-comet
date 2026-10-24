// Neon Comet service worker: caches the whole game so it runs fully offline.
// Saves live in localStorage and are never touched by updates.
// Release: bump VERSION, commit, push.
const VERSION = 'neon-comet-v3';
const ASSETS = [
  './',
  './manifest.webmanifest',
  './css/style.css',
  './js/data.js',
  './js/core.js',
  './js/game.js',
  './js/ui.js',
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

function fromNetwork(req, key) {
  return fetch(req).then(res => {
    if (res.ok && !res.redirected) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(key || req, copy)); }
    return res;
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const path = new URL(req.url).pathname;

  // Page: network first, cached under './' (Cloudflare Pages redirects /index.html to /).
  if (req.mode === 'navigate') {
    e.respondWith(fromNetwork(req, './').catch(() => caches.match('./')));
    return;
  }
  // Code: network first so updates land immediately when online, cache when offline.
  if (/\.(js|css|webmanifest)$/.test(path)) {
    e.respondWith(fromNetwork(req).catch(() => caches.match(req)));
    return;
  }
  // Fonts and images: cache first.
  e.respondWith(caches.match(req).then(hit => hit || fromNetwork(req)));
});
