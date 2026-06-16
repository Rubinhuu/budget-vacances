// Service worker — Budget Vacances
// Met en cache l'interface (app shell) pour un démarrage rapide et un usage hors-ligne.
// Laisse passer Firebase / polices / images externes vers le réseau.

const CACHE = 'budget-vacances-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // ne touche qu'aux fichiers de l'app (même origine) ; le reste (Firebase, polices…) part au réseau
  if (url.origin !== location.origin) return;

  // Pages : réseau d'abord (pour toujours avoir la dernière version), cache si hors-ligne
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Autres fichiers de l'app : cache d'abord, réseau en secours
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    }))
  );
});
