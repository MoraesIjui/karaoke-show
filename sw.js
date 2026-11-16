/* Service Worker offline-first, escopo relativo ao diretório de publicação. */
const CACHE_NAME = 'karaoke-show-shell-v6';
const FILES = [
  './', './index.html', './redefinir-senha.html', './styles.css', './manifest.webmanifest', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png',
  './src/app.js','./src/audio.js','./src/importer.js','./src/pitch.js','./src/remote.js',
  './src/scoring.js','./src/songs.js','./src/storage.js','./src/cloud.js','./src/cloud-config.js','./src/midi.js','./src/midi4you-catalog.js','./src/midi-audio.js','./src/password-reset.js'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([self.clients.claim(), caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))]));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok && url.pathname.startsWith(new URL(self.registration.scope).pathname)) {
      const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request,copy));
    }
    return response;
  }).catch(() => caches.match('./index.html'))));
});
