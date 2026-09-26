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

const baseUrl = "http://localhost:3000"
const screenshots = resolve("artifacts/screenshots")
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const businessDate = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Riyadh",
}).format(new Date())
const start = new Date(`${businessDate}T00:00:00+03:00`)
const end = new Date(start)
end.setUTCDate(end.getUTCDate() + 1)

async function countEntries(entryKind) {
  const { count, error } = await service
    .from("market_entries")
    .select("id", { count: "exact", head: true })
    .eq("entry_kind", entryKind)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
  if (error) throw error
  return count ?? 0
}

const [sellerCount, visitorCount] = await Promise.all([countEntries("seller"), countEntries("visitor")])
await mkdir(screenshots, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
})

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" })
  await page.locator("#email").fill(env.RSO_AUCTIONEER_EMAIL)
  await page.locator("#password").fill(env.RSO_AUCTIONEER_PASSWORD)
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 20_000 }),
    page.getByRole("button", { name: "دخول إلى المنصة" }).click(),
  ])

  const metricLabel = page.getByText("دخولات البائعين اليوم", { exact: true })
  await metricLabel.waitFor()
  const metricCard = metricLabel.locator('xpath=ancestor::*[@data-slot="card"][1]')
  const displayedValue = (await metricCard.locator('[data-slot="card-title"]').textContent())?.trim()
  const expectedValue = new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(sellerCount)

  assert(displayedValue === expectedValue, `عدد البائعين في اللوحة (${displayedValue}) لا يطابق قاعدة البيانات (${expectedValue})`)
  assert(await page.getByText("البائعون المسجلون اليوم", { exact: true }).count() === 1, "وصف المؤشر غير واضح")
  assert(await page.getByText("دخولات السوق", { exact: true }).count() === 0, "ما زال المسمى القديم ظاهرًا")

  await page.screenshot({ path: resolve(screenshots, "auctioneer-today-seller-entries.png"), fullPage: true })

  console.log(JSON.stringify({
    ok: true,
    businessDate,
    sellerCount,
    visitorCountExcluded: visitorCount,
    displayedValue,
    checks: ["riyadh-business-day", "seller-only-count", "clear-arabic-label"],
    screenshot: "auctioneer-today-seller-entries.png",
  }, null, 2))

  await context.close()
} finally {
  await browser.close()
}
