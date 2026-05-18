const CACHE = 'mqr-v1'
const ASSET_PATTERNS = [/\/assets\//]

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return

  // Cache-first for static assets
  if (ASSET_PATTERNS.some(p => p.test(url.pathname))) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached
          return fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone())
            return res
          })
        })
      )
    )
    return
  }

  // Network-first for navigation (HTML pages)
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            caches.open(CACHE).then(c => c.put(request, res.clone()))
          }
          return res
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
    )
  }
})
