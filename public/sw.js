const CACHE_VERSION = "rso-pwa-v2"
const STATIC_CACHE = `${CACHE_VERSION}-static`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
const OFFLINE_URL = "/offline"
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/logo.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/pwa-maskable-512x512.png",
  "/apple-touch-icon.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("rso-pwa-") && ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting()
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (url.pathname === "/" && response.ok) {
          const copy = response.clone()
          const cache = await caches.open(RUNTIME_CACHE)
          await cache.put(request, copy)
        }
        return response
      } catch {
        return (await caches.match(request)) || (await caches.match(OFFLINE_URL)) || Response.error()
      }
    })())
    return
  }

  const isSafeAsset = url.pathname.startsWith("/_next/static/")
    || url.pathname.startsWith("/_next/image")
    || /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)

  if (!isSafeAsset) return

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (!response.ok || response.type !== "basic") return response
      const copy = response.clone()
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
      return response
    })),
  )
})
