/* TimeBank Academy service worker — minimal offline shell.
   - navigations: network-first, fall back to cache, then to '/' offline.
   - same-origin static assets: cache-first (stale-while-revalidate-ish).
   - never touches /api/* or cross-origin (Supabase/Gemini/JaaS) requests.
   Bump CACHE to invalidate. skipWaiting + clients.claim keep it self-updating. */
const CACHE = 'tb-shell-v2'
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

/* ---- Web Push: show the notification, even when the app is closed ---- */
self.addEventListener('push', (e) => {
  let data = {}
  try { data = e.data ? e.data.json() : {} }
  catch { data = { body: e.data && e.data.text ? e.data.text() : '' } }
  const title = data.title || 'TimeBank Academy'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/home' },
    tag: data.tag || undefined,
    renotify: !!data.tag,
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

/* ---- Tapping a notification focuses an open tab or opens the target ---- */
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = (e.notification.data && e.notification.data.url) || '/home'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { try { c.navigate(target) } catch (_) {} return c.focus() }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})
