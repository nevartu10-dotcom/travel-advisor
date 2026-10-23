// Service worker: installable PWA + offline app shell.
//  - App files: served from cache, refreshed in the background.
//  - Map tiles: cache-first (capped), so maps you've seen work offline.
//  - Live data APIs: always network first; the last answer is used only when offline.

const VERSION = 'v4';
const SHELL = `ta-shell-${VERSION}`;
const TILES = 'ta-tiles';
const DATA = 'ta-data';
const MAX_TILES = 600;

const SHELL_FILES = [
  './',
  'index.html',
  'css/app.css',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'js/app.js',
  'js/store.js',
  'js/ui.js',
  'js/map.js',
  'js/form.js',
  'js/detail.js',
  'js/api/http.js',
  'js/api/geocode.js',
  'js/api/country.js',
  'js/api/weather.js',
  'js/api/holidays.js',
  'js/api/safety.js',
  'js/api/places.js',
  'js/api/news.js',
  'js/api/phrases.js',
  'js/data/plugs.js',
  'js/data/phrasebook.js',
  'js/data/languages.js',
  'vendor/leaflet/leaflet.css',
  'vendor/leaflet/src/Leaflet.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ta-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimTiles() {
  const cache = await caches.open(TILES);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App shell and everything else from this origin: stale-while-revalidate.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(SHELL).then(async (cache) => {
        const cached = await cache.match(req, { ignoreSearch: true });
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached || (req.mode === 'navigate' ? cache.match('index.html') : Response.error()));
        return cached || network;
      })
    );
    return;
  }

  // Map tiles and fonts: cache first.
  if (url.hostname.endsWith('tile.openstreetmap.org') || url.hostname.endsWith('fonts.gstatic.com') || url.hostname.endsWith('fonts.googleapis.com')) {
    e.respondWith(
      caches.open(TILES).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.ok || res.type === 'opaque') {
            cache.put(req, res.clone());
            trimTiles();
          }
          return res;
        } catch {
          return Response.error();
        }
      })
    );
    return;
  }

  // Live data: network first, last good answer only as an offline fallback.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(DATA).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => (await caches.match(req)) || Response.error())
  );
});
