import { chromium } from "playwright-core"
import { randomBytes } from "node:crypto"
import { mkdir, readFile } from "node:fs/promises"
import { resolve } from "node:path"

const env = Object.fromEntries(
  (await readFile(".env.local", "utf8")).split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
    const separator = line.indexOf("=")
    return [line.slice(0, separator), line.slice(separator + 1)]
  }),
)

const baseUrl = "http://localhost:3000"
const screenshots = resolve("artifacts/screenshots")
await mkdir(screenshots, { recursive: true })

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function createTestPassword(label) {
  return `${label}-${randomBytes(18).toString("base64url")}!7aA`
}

function pass(feature, detail) {
  console.log(`PASS | ${feature} | ${detail}`)
}

async function login(browser, email, password, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" })
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith("/dashboard"), { timeout: 20_000 }),
    page.getByRole("button", { name: "دخول إلى المنصة" }).click(),
  ])
  return { context, page }
}

async function assertResponsive(page, path, viewport) {
  await page.setViewportSize(viewport)
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" })
  assert(response?.ok(), `${path} returned ${response?.status()}`)
  const result = await page.evaluate(() => ({
    rootWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    bodyText: document.body.innerText,
  }))
  assert(result.rootWidth <= result.viewportWidth + 1, `${path} overflows horizontally at ${viewport.width}px (${result.rootWidth}px)`)
  assert(result.bodyText.trim().length > 20, `${path} rendered no meaningful content`)
  const technicalText = /supabase|postgres|pgrst|\bjwt\b|\brls\b|\bsql\b|constraint|schema|database|قاعدة البيانات|خطأ تقني/i
  assert(!technicalText.test(result.bodyText), `${path} exposes technical language to the user`)
}

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
})

try {
  const performanceContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await performanceContext.addInitScript(() => {
    window.__rsoVitals = { lcp: 0, cls: 0 }
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries.at(-1)
      if (last) window.__rsoVitals.lcp = last.startTime
    }).observe({ type: "largest-contentful-paint", buffered: true })
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__rsoVitals.cls += entry.value
    }).observe({ type: "layout-shift", buffered: true })
  })
  const performancePage = await performanceContext.newPage()
  await performancePage.goto(baseUrl, { waitUntil: "networkidle" })
  await performancePage.waitForTimeout(750)
  const metrics = await performancePage.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0]
    return {
      ttfb: Math.round(navigation.responseStart),
      domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
      load: Math.round(navigation.loadEventEnd),
      lcp: Math.round(window.__rsoVitals?.lcp ?? 0),
      cls: Number((window.__rsoVitals?.cls ?? 0).toFixed(3)),
    }
  })
  assert(metrics.ttfb < 1_000, `TTFB is too high: ${metrics.ttfb}ms`)
  assert(metrics.domContentLoaded < 2_500, `DOMContentLoaded is too high: ${metrics.domContentLoaded}ms`)
  assert(metrics.lcp === 0 || metrics.lcp < 2_500, `LCP is too high: ${metrics.lcp}ms`)
  assert(metrics.cls < 0.1, `CLS is too high: ${metrics.cls}`)
  pass("سرعة الصفحة الرئيسية", `TTFB ${metrics.ttfb}ms · DOM ${metrics.domContentLoaded}ms · LCP ${metrics.lcp}ms · CLS ${metrics.cls}`)
  await performanceContext.close()

  const publicContext = await browser.newContext({ viewport: { width: 360, height: 800 } })
  const publicPage = await publicContext.newPage()
  for (const path of ["/", "/auth/login", "/auth/register", "/auth/forgot-password", "/verify?q=1234"]) {
    await assertResponsive(publicPage, path, { width: 360, height: 800 })
  }
  await publicPage.goto(`${baseUrl}/auth/login?error=${encodeURIComponent("duplicate key value violates unique constraint users_email_key")}`, { waitUntil: "networkidle" })
  await publicPage.getByText("تعذر إكمال الطلب الآن. حاول مرة أخرى، وإذا استمرت المشكلة فتواصل مع مدير المنصة.").waitFor()
  assert(!/duplicate|constraint/i.test(await publicPage.locator("body").innerText()), "Technical error details were shown")
  pass("سلامة رسائل الخطأ", "حُجبت التفاصيل التقنية وظهر بديل عربي واضح")

  await publicPage.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" })
  await publicPage.locator("#email").fill("wrong@example.com")
  await publicPage.locator("#password").fill(createTestPassword("Invalid"))
  await publicPage.route("**/*", async (route) => {
    if (route.request().method() === "POST") await new Promise((resolve) => setTimeout(resolve, 700))
    await route.continue()
  })
  const submitPromise = publicPage.getByRole("button", { name: "دخول إلى المنصة" }).click()
  await publicPage.getByRole("button", { name: "جاري تسجيل الدخول…" }).waitFor({ timeout: 2_000 })
  const pendingButton = publicPage.getByRole("button", { name: "جاري تسجيل الدخول…" })
  assert(await pendingButton.isDisabled(), "Submit button stayed enabled while pending")
  assert(await pendingButton.getAttribute("aria-busy") === "true", "Pending button did not expose aria-busy")
  await publicPage.screenshot({ path: resolve(screenshots, "ux-loading-login-mobile.png"), fullPage: true })
  await submitPromise
  await publicPage.getByText("تحقق من البريد وكلمة المرور ومن تفعيل بريدك الإلكتروني، ثم حاول مرة أخرى.").waitFor()
  pass("مؤشر تحميل النماذج", "ظهر المؤشر فورًا، وتعطل الزر حتى اكتمال الطلب")
  await publicPage.goto(baseUrl, { waitUntil: "networkidle" })
  await publicPage.screenshot({ path: resolve(screenshots, "ux-home-mobile.png"), fullPage: true })
  await publicContext.close()

  const admin = await login(browser, env.RSO_ADMIN_EMAIL, env.RSO_ADMIN_PASSWORD)
  const adminPaths = ["/dashboard", "/dashboard/admin/users", "/dashboard/admin/buyers", "/dashboard/admin/commissions", "/dashboard/admin/reports", "/dashboard/admin/settings", "/dashboard/receipts", "/dashboard/account"]
  for (const viewport of [{ width: 360, height: 800 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }]) {
    for (const path of adminPaths) await assertResponsive(admin.page, path, viewport)
  }
  await admin.page.setViewportSize({ width: 1440, height: 1000 })
  const cdp = await admin.context.newCDPSession(admin.page)
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "display-mode", value: "standalone" }] })
  await admin.page.goto(`${baseUrl}/dashboard/admin/settings`, { waitUntil: "networkidle" })
  await admin.page.evaluate(() => window.scrollTo({ top: 650, behavior: "instant" }))
  const headerSurface = await admin.page.locator("[data-dashboard-header]").evaluate((header) => {
    const backgroundColor = getComputedStyle(header).backgroundColor
    const canvas = document.createElement("canvas")
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext("2d")
    if (!context) return { backgroundColor, alpha: 0 }
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = backgroundColor
    context.fillRect(0, 0, 1, 1)
    return { backgroundColor, alpha: context.getImageData(0, 0, 1, 1).data[3] }
  })
  assert(headerSurface.alpha === 255, `Dashboard header is translucent: ${headerSurface.backgroundColor}`)
  await admin.page.screenshot({ path: resolve(screenshots, "pwa-dashboard-header-solid.png") })
  pass("هيدر تطبيق PWA", `خلفية صلبة بقناة شفافية ${headerSurface.alpha}/255 في وضع standalone`)
  await admin.page.setViewportSize({ width: 360, height: 800 })
  await admin.page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" })
  await admin.page.screenshot({ path: resolve(screenshots, "ux-admin-dashboard-mobile.png"), fullPage: true })
  await admin.page.setViewportSize({ width: 768, height: 1024 })
  await admin.page.goto(`${baseUrl}/dashboard/admin/reports`, { waitUntil: "networkidle" })
  await admin.page.screenshot({ path: resolve(screenshots, "ux-attendance-report-tablet.png"), fullPage: true })
  await admin.context.close()
  pass("استجابة شاشات المدير", "8 شاشات اجتازت الهاتف والتابلت وسطح المكتب دون تمرير أفقي للصفحة")

  const gatekeeper = await login(browser, env.RSO_GATEKEEPER_EMAIL, env.RSO_GATEKEEPER_PASSWORD, { width: 360, height: 800 })
  await assertResponsive(gatekeeper.page, "/dashboard/entries/new", { width: 360, height: 800 })
  await gatekeeper.context.close()
  const auctioneer = await login(browser, env.RSO_AUCTIONEER_EMAIL, env.RSO_AUCTIONEER_PASSWORD, { width: 360, height: 800 })
  await assertResponsive(auctioneer.page, "/dashboard/settlements/new", { width: 360, height: 800 })
  await auctioneer.context.close()
  pass("استجابة شاشات التشغيل", "شاشتا البواب والدلال تعملان بعرض 360px دون تجاوز أفقي")

  console.log(JSON.stringify({ ok: true, performance: metrics, screenshots: ["ux-loading-login-mobile.png", "ux-home-mobile.png", "ux-admin-dashboard-mobile.png", "ux-attendance-report-tablet.png", "pwa-dashboard-header-solid.png"] }, null, 2))
} finally {
  await browser.close()
}
