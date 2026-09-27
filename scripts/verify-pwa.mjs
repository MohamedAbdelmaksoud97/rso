import { chromium } from "playwright-core"
import sharp from "sharp"

const baseUrl = "http://localhost:3000"
const checks = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const manifestResponse = await fetch(`${baseUrl}/manifest.webmanifest`)
assert(manifestResponse.ok, "Manifest route is unavailable")
assert(manifestResponse.headers.get("content-type")?.includes("application/manifest+json"), "Manifest content type is incorrect")
const manifest = await manifestResponse.json()
assert(manifest.name === "منصة رسو لحوكمة المزادات", "Manifest name is incorrect")
assert(manifest.short_name === "رسو", "Manifest short name is incorrect")
assert(manifest.display === "standalone" && manifest.dir === "rtl" && manifest.lang === "ar", "Manifest display or Arabic settings are incorrect")
assert(manifest.icons?.some((icon) => icon.sizes === "192x192"), "192px icon is missing")
assert(manifest.icons?.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"), "Maskable icon is missing")
checks.push("valid-web-manifest")

for (const [path, size] of [["pwa-192x192.png", 192], ["pwa-512x512.png", 512], ["pwa-maskable-512x512.png", 512], ["apple-touch-icon.png", 180]]) {
  const metadata = await sharp(`public/${path}`).metadata()
  assert(metadata.width === size && metadata.height === size, `${path} has invalid dimensions`)
}
checks.push("install-icons")

const workerResponse = await fetch(`${baseUrl}/sw.js`)
assert(workerResponse.ok, "Service worker route is unavailable")
assert(workerResponse.headers.get("content-type")?.includes("application/javascript"), "Service worker content type is incorrect")
assert(workerResponse.headers.get("cache-control")?.includes("no-store"), "Service worker cache policy is unsafe")
assert(workerResponse.headers.get("service-worker-allowed") === "/", "Service worker scope header is missing")
checks.push("service-worker-security-headers")

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
})

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "allow" })
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: "networkidle" })
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload({ waitUntil: "networkidle" })

  const browserState = await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    const cacheNames = await caches.keys()
    const cachedUrls = []
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName)
      const requests = await cache.keys()
      cachedUrls.push(...requests.map((request) => new URL(request.url).pathname))
    }
    return {
      controlled: Boolean(navigator.serviceWorker.controller),
      registrationCount: registrations.length,
      cacheNames,
      cachedUrls,
      manifestHref: document.querySelector('link[rel="manifest"]')?.getAttribute("href"),
      appleIcon: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href"),
      themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
    }
  })

  assert(browserState.controlled && browserState.registrationCount === 1, "The page is not controlled by the service worker")
  assert(browserState.cacheNames.includes("rso-pwa-v3-static"), "Static PWA cache was not created")
  assert(browserState.cacheNames.includes("rso-pwa-v3-runtime") && browserState.cachedUrls.includes("/"), "The latest public homepage was not cached for offline use")
  assert(!browserState.cachedUrls.some((path) => path.startsWith("/dashboard") || path.startsWith("/auth")), "Sensitive account pages were cached")
  assert(browserState.manifestHref === "/manifest.webmanifest", "Manifest link is missing from the document")
  assert(browserState.appleIcon === "/apple-touch-icon.png", "Apple touch icon is missing")
  assert(browserState.themeColor === "#0b4f24", "Theme color is missing")
  checks.push("registered-and-controlled")
  checks.push("sensitive-routes-not-cached")

  const cdp = await context.newCDPSession(page)
  const appManifest = await cdp.send("Page.getAppManifest")
  assert(appManifest.url.endsWith("/manifest.webmanifest"), "Chrome did not discover the manifest")
  assert(!appManifest.errors?.length, `Chrome reported manifest errors: ${JSON.stringify(appManifest.errors)}`)
  checks.push("chrome-manifest-validation")

  const installability = await cdp.send("Page.getInstallabilityErrors")
  const actionableInstallabilityErrors = installability.installabilityErrors.filter((error) => error.errorId !== "in-incognito")
  assert(actionableInstallabilityErrors.length === 0, `Chrome reported installability errors: ${JSON.stringify(actionableInstallabilityErrors)}`)
  checks.push("chrome-installability")

  await context.setOffline(true)
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" })
  const offlineText = await page.locator("body").innerText()
  assert(offlineText.includes("أنت غير متصل بالإنترنت"), "Offline navigation did not show the safe fallback page")
  checks.push("offline-fallback")

  await page.evaluate(async () => {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
  })
  await page.goto(`${baseUrl}/unavailable-with-empty-cache`, { waitUntil: "domcontentloaded" })
  const emptyCacheFallback = await page.locator("body").innerText()
  assert(emptyCacheFallback.includes("تعذر الاتصال بالمنصة"), "An empty PWA cache surfaced a browser ERR_FAILED page")
  checks.push("empty-cache-safe-fallback")
  await context.setOffline(false)
  await context.close()
} finally {
  await browser.close()
}

console.log(JSON.stringify({ ok: true, checks }, null, 2))
