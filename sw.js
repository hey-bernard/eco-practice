// 오프라인에서도 열리도록 앱 파일을 캐시한다. 네트워크를 먼저 쓰고, 안 되면 캐시로.
// 파일을 바꿔 배포할 때 VERSION을 올린다.
const VERSION = 'v4';
const CACHE = `eco-practice-${VERSION}`;
const SHELL = ['./', './index.html', './css/style.css', './js/app.js', './js/audience.js', './js/data.js', './js/store.js', './js/village.js', './manifest.webmanifest', './icons/icon.svg',
  './images/village/earth.webp', './images/village/risa.webp',
  ...[1, 2, 3, 4, 5, 6].map((n) => `./images/forest/stage${n}.webp`)];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
