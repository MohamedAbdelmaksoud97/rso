import { chromium } from "playwright-core"
import { createClient } from "@supabase/supabase-js"
import { mkdir, readFile } from "node:fs/promises"
import { resolve } from "node:path"

const env = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=")
      return [line.slice(0, separator), line.slice(separator + 1)]
    }),
)

const outputDir = resolve("artifacts/screenshots")
await mkdir(outputDir, { recursive: true })

const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const { data: settlement, error: settlementError } = await service
  .from("auction_settlements")
  .select("receipt_number,market_entries(id,qr_token)")
  .order("settled_at", { ascending: false })
  .limit(1)
  .single()
if (settlementError) throw settlementError

const baseUrl = "http://localhost:3000"
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
})

async function save(page, name, url) {
  await page.goto(`${baseUrl}${url}`, { waitUntil: "networkidle" })
  await page.screenshot({ path: resolve(outputDir, `${name}.png`), fullPage: true })
  console.log(`${name}: ${await page.title()}`)
}

async function authenticatedContext(email, password) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" })
    if (response?.ok() && await page.locator("#email").count()) break
    if (attempt === 2) throw new Error("Login page did not become available")
    await page.waitForTimeout(1000)
  }
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith("/dashboard"), { timeout: 20000 }),
    page.getByRole("button", { name: "دخول إلى المنصة" }).click(),
  ])
  return { context, page }
}

const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const publicPage = await publicContext.newPage()
await save(publicPage, "home", "/")
await save(publicPage, "login", "/auth/login")
await save(publicPage, "public-verification", `/verify?q=${encodeURIComponent(settlement.receipt_number)}`)
await publicContext.close()

const admin = await authenticatedContext(env.RSO_ADMIN_EMAIL, env.RSO_ADMIN_PASSWORD)
await save(admin.page, "admin-dashboard", "/dashboard")
await save(admin.page, "admin-users", "/dashboard/admin/users")
await admin.context.close()

const gatekeeper = await authenticatedContext(env.RSO_GATEKEEPER_EMAIL, env.RSO_GATEKEEPER_PASSWORD)
await save(gatekeeper.page, "gatekeeper-entry", "/dashboard/entries/new")
await save(gatekeeper.page, "gatekeeper-qr", `/dashboard/entries/${settlement.market_entries.id}`)
await gatekeeper.context.close()

const auctioneer = await authenticatedContext(env.RSO_AUCTIONEER_EMAIL, env.RSO_AUCTIONEER_PASSWORD)
await save(auctioneer.page, "auctioneer-settlement", "/dashboard/settlements/new")
await save(auctioneer.page, "receipt", `/dashboard/receipts/${settlement.receipt_number}`)
await auctioneer.context.close()

const iosContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
})
const iosPage = await iosContext.newPage()
await iosPage.goto(baseUrl, { waitUntil: "networkidle" })
await iosPage.getByRole("button", { name: "تثبيت تطبيق رسو" }).click()
await iosPage.screenshot({ path: resolve(outputDir, "pwa-install-ios.png"), fullPage: false })
await iosContext.close()

const offlineContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "allow" })
const offlinePage = await offlineContext.newPage()
await offlinePage.goto(baseUrl, { waitUntil: "networkidle" })
await offlinePage.evaluate(() => navigator.serviceWorker.ready)
await offlinePage.reload({ waitUntil: "networkidle" })
await offlineContext.setOffline(true)
await offlinePage.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" })
await offlinePage.screenshot({ path: resolve(outputDir, "pwa-offline.png"), fullPage: true })
await offlineContext.setOffline(false)
await offlineContext.close()

await browser.close()
