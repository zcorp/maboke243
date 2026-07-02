const CACHE_NAME = 'maboke243-v1'
const STATIC_ASSETS = ['/', '/index.html']

// Install — cache static shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate — remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — stale-while-revalidate for pages, cache-first for assets
self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Skip non-GET and API calls
  if (request.method !== 'GET') return
  if (url.hostname !== self.location.hostname && !url.pathname.startsWith('/img')) return

  // Images thumbnails from YouTube — cache with timeout
  if (url.hostname === 'i.ytimg.com') {
    e.respondWith(
      caches.open(CACHE_NAME + '-thumb').then(async cache => {
        const cached = await cache.match(request)
        if (cached) return cached
        try {
          const fresh = await fetch(request)
          if (fresh.ok) cache.put(request, fresh.clone())
          return fresh
        } catch { return cached || new Response('', { status: 408 }) }
      })
    )
    return
  }

  // App shell — stale-while-revalidate
  e.respondWith(
    caches.match(request).then(cached => {
      const fresh = fetch(request).then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(c => c.put(request, res.clone()))
        return res
      }).catch(() => cached)
      return cached || fresh
    })
  )
})
