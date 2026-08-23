const CACHE = 'ipbooster-v6-bundle-resolver';
const CORE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './smart-play-resolver.js',
  './smart-launch.js',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-180.png',
  './assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function injectResolver(response) {
  if (!response || !response.ok) return response;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;

  let html = await response.text();
  const resolverTag = '<script src="./smart-play-resolver.js" defer></script>';
  if (!html.includes('smart-play-resolver.js')) {
    const smartTag = '<script src="./smart-launch.js" defer></script>';
    if (html.includes(smartTag)) html = html.replace(smartTag, `${resolverTag}\n  ${smartTag}`);
    else html = html.replace('</body>', `  ${resolverTag}\n</body>`);
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const network = await fetch(event.request, { cache: 'no-store' });
        const injected = await injectResolver(network);
        const copy = injected.clone();
        caches.open(CACHE).then(cache => cache.put('./index.html', copy));
        return injected;
      } catch {
        const cached = await caches.match('./index.html');
        return injectResolver(cached);
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
