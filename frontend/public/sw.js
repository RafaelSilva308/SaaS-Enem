// ENEM Pro Service Worker — cache + Web Push
const STATIC_CACHE = 'saas-enem-static-v1'
const API_CACHE    = 'saas-enem-api-v1'
const API_TTL_MS   = 5 * 60 * 1000 // 5 minutes

// In-memory timestamp map (persists for SW lifetime)
const apiTimestamps = new Map()

// ── Install ────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      // Precache shell pages — errors are silent (dynamic routes may not exist yet)
      Promise.allSettled([
        cache.add('/'),
        cache.add('/app/dashboard'),
        cache.add('/app/banco-questoes'),
      ])
    )
  )
})

// ── Activate ───────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== API_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (!request.url.startsWith('http')) return

  const url = new URL(request.url)

  // Next.js static bundles — cache-first forever
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirstStatic(request))
    return
  }

  // API requests — stale-while-revalidate with 5-min TTL
  if (url.pathname.includes('/api/v1/')) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // App pages — network-first, fallback to cache
  if (url.pathname.startsWith('/app/')) {
    event.respondWith(
      fetch(request)
        .then(res => { cachePageIfOk(res.clone(), request); return res })
        .catch(() => caches.match(request))
    )
    return
  }
})

async function cacheFirstStatic(request) {
  const hit = await caches.match(request)
  if (hit) return hit
  const res = await fetch(request)
  if (res.ok) {
    const cache = await caches.open(STATIC_CACHE)
    cache.put(request, res.clone())
  }
  return res
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE)
  const cached = await cache.match(request)
  const ts = apiTimestamps.get(request.url) || 0
  const fresh = (Date.now() - ts) < API_TTL_MS

  const networkFetch = fetch(request).then(res => {
    if (res.ok) {
      cache.put(request, res.clone())
      apiTimestamps.set(request.url, Date.now())
    }
    return res
  }).catch(() => cached || new Response('Offline', { status: 503 }))

  if (cached && fresh) {
    // Return cache immediately; revalidate in background
    networkFetch.catch(() => {})
    return cached
  }
  return networkFetch
}

async function cachePageIfOk(res, request) {
  if (!res.ok) return
  const cache = await caches.open(STATIC_CACHE)
  cache.put(request, res)
}

// ── Push Notifications ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = { title: 'ENEM Pro', message: 'Nova notificação', url: '/app/notificacoes' }
  try {
    if (event.data) Object.assign(payload, event.data.json())
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.message,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'enem-pro',
      renotify: true,
      data: { url: payload.url },
      actions: [{ action: 'open', title: 'Ver' }],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/app/dashboard'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const existing = clients.find(c => c.url.includes(url))
        return existing ? existing.focus() : self.clients.openWindow(url)
      })
  )
})
