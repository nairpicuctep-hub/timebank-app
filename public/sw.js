/* TimeBank Academy service worker — minimal offline shell.
   - navigations: network-first, fall back to cache, then to '/' offline.
   - same-origin static assets: cache-first (stale-while-revalidate-ish).
   - never touches /api/* or cross-origin (Supabase/Gemini/JaaS) requests.
   Bump CACHE to invalidate. skipWaiting + clients.claim keep it self-updating. */
const CACHE = 'tb-shell-v1'
const SHELL = ['/', '/home', '/icon-192.png', '/LOGO_Timebank_Academy.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return       // skip Supabase / Gemini / JaaS / CDNs
  if (url.pathname.startsWith('/api/')) return           // never cache API responses

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return res })
        .catch(() => caches.match(request).then((m) => m || caches.match('/')))
    )
    return
  }

  const isStatic = url.pathname.startsWith('/_next/') || /\.(png|svg|jpg|jpeg|webp|gif|ico|woff2?|css|js|mjs)$/.test(url.pathname)
  if (!isStatic) return
  e.respondWith(
    caches.match(request).then((m) => m || fetch(request).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)) }
      return res
    }))
  )
})
