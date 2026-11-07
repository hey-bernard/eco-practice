// 오프라인에서도 열리도록 앱 파일을 캐시한다. 네트워크를 먼저 쓰고, 안 되면 캐시로.
// 파일을 바꿔 배포할 때 VERSION을 올린다.
const VERSION = 'v28';
const CACHE = `eco-practice-${VERSION}`;
const SHELL = ['./js/data.js', './js/store.js', './js/climate-data.js', './js/climate-chart.js', './css/climate-chart.css', './manifest.webmanifest', './icons/icon.svg',
  './climate/', './climate/index.html', './climate/style.css', './climate/app.js',
  './js/earth-now-widget.js', './js/achievements-widget.js', './js/achievements.js', './css/achievements.css', './js/series.js', './js/series-data.js', './css/series.css', './images/earth/earth-day.webp', './images/earth/earth-night.webp', './images/earth/earth-clouds.webp',
  './js/practice-plant.js', './js/vendor/lottie_light.min.js', './images/lottie/plant-grow.json',
  ...[1, 2, 3, 4, 5, 6].map((n) => `./images/forest/plant${n}.svg`)];

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
  if (e.request.method !== 'GET' || new URL(e.request.url).pathname.startsWith('/api/')) return;
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
