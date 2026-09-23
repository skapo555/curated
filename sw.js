/* App-shell cache.
   The shell is network-first so a published update is picked up on the next
   load; content under data/ is always network (never served stale), and the
   cache is only a fallback for going offline. */
const CACHE = 'curated-v18';
const SHELL = ['./', './index.html', './css/styles.css', './js/app.js', './js/store.js', './js/data.js', './js/auth.js', './js/sync.js', './manifest.webmanifest', './icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // fonts, publisher images: leave to the browser

  const isContent = url.pathname.includes('/data/');
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        // Only a page navigation may fall back to the shell — never a JSON or asset request.
        if (req.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        return new Response(isContent ? '{}' : '', { status: 504, statusText: 'Offline' });
      })
  );
});
