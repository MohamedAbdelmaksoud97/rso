const CACHE_VERSION = "rso-pwa-v3"
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
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE)
    await Promise.allSettled(PRECACHE_URLS.map(async (url) => {
      const response = await fetch(url, { cache: "reload" })
      if (response.ok) await cache.put(url, response)
    }))
    await self.skipWaiting()
  })())
})

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys
      .filter((key) => key.startsWith("rso-pwa-") && ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
      .map((key) => caches.delete(key)))
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable()
    await self.clients.claim()
  })())
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
        const response = (await event.preloadResponse) || await fetch(request)
        if (url.pathname === "/" && response.ok) {
          const copy = response.clone()
          const cache = await caches.open(RUNTIME_CACHE)
          await cache.put(request, copy)
        }
        return response
      } catch {
        const cached = (await caches.match(request)) || (await caches.match(OFFLINE_URL))
        if (cached) return cached

        // Always return a real document. Response.error() surfaces as Chrome's
        // opaque ERR_FAILED page when an older or partially populated cache is used.
        return new Response(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تعذر الاتصال</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#faf8f3;color:#183424;font-family:system-ui,sans-serif}.card{max-width:32rem;margin:1.5rem;padding:2rem;border:1px solid #ded8ca;border-radius:1.5rem;background:#fff;text-align:center;box-shadow:0 1rem 3rem #18342418}h1{font-size:1.5rem}p{line-height:1.8;color:#657068}button{border:0;border-radius:.8rem;background:#0b4f24;color:#fff;padding:.8rem 1.2rem;font:inherit;font-weight:700;cursor:pointer}</style><main class="card"><h1>تعذر الاتصال بالمنصة</h1><p>تحقق من اتصالك بالإنترنت، ثم أعد المحاولة.</p><button onclick="location.reload()">إعادة المحاولة</button></main></html>`, {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        })
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
