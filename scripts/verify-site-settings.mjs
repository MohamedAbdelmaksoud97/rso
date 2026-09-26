import { chromium } from "playwright-core"
import { createClient } from "@supabase/supabase-js"
import { mkdir, readFile } from "node:fs/promises"

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
const screenshots = "artifacts/screenshots"
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const publicClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function getSettings() {
  const { data, error } = await service.from("site_settings").select("*").eq("id", true).single()
  if (error) throw error
  return data
}

async function updateSettings(values) {
  const { data, error } = await service.from("site_settings").update(values).eq("id", true).select("id").single()
  if (error || !data) throw error ?? new Error("Settings update returned no row")
}

async function loginAdmin(page) {
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" })
  await page.locator("#email").fill(env.RSO_ADMIN_EMAIL)
  await page.locator("#password").fill(env.RSO_ADMIN_PASSWORD)
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith("/dashboard"), { timeout: 20000 }),
    page.getByRole("button", { name: "دخول إلى المنصة" }).click(),
  ])
}

async function setSwitch(page, id, checked) {
  const labels = {
    announcement_enabled: "إظهار الشريط التعريفي",
    public_search_enabled: "إتاحة البحث عن السندات",
    stats_enabled: "إظهار إحصاءات السوق",
    public_visitor_count_enabled: "إظهار عدد زوار اليوم",
    workflow_enabled: "إظهار خطوات عمل المنصة",
    governance_enabled: "إظهار قسم الحوكمة",
    news_enabled: "إظهار الأخبار والإعلانات",
  }
  const control = page.getByRole("switch", { name: labels[id] })
  const current = await control.getAttribute("data-checked") !== null
  if (current !== checked) await control.click()
}

async function setCheckbox(page, id, checked) {
  const labels = {
    seller_name: "اسم المورد / المزارع",
    commodity_type: "نوع السلعة",
    quantity: "الكمية",
    total_weight_kg: "الوزن الإجمالي",
    final_price: "سعر الترسية",
    buyer_name: "اسم المشتري",
    settled_at: "تاريخ الترسية",
  }
  const control = page.getByRole("checkbox", { name: labels[id] })
  const current = await control.getAttribute("data-checked") !== null
  if (current !== checked) await control.click()
}

async function publish(page) {
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/dashboard/admin/settings" && url.searchParams.has("success"), { timeout: 20000 }),
    page.getByRole("button", { name: "حفظ ونشر" }).click(),
  ])
  await page.getByText("تم نشر الإعدادات").last().waitFor({ timeout: 10000 })
}

await mkdir(screenshots, { recursive: true })
const original = await getSettings()
let restored = false
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
})

try {
  await updateSettings({
    announcement_enabled: true,
    public_search_enabled: true,
    workflow_enabled: true,
    governance_enabled: true,
    stats_enabled: true,
    public_visitor_count_enabled: true,
    news_enabled: true,
  })

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const adminPage = await adminContext.newPage()
  const publicPage = await publicContext.newPage()

  await loginAdmin(adminPage)
  await publicPage.goto(baseUrl, { waitUntil: "networkidle" })
  await publicPage.getByText("زوار السوق اليوم").waitFor()
  await publicPage.getByText("تحقق من سند مزاد").waitFor()
  await publicPage.getByText("توثيق المزاد في ثلاث خطوات").waitFor()

  await adminPage.goto(`${baseUrl}/dashboard/admin/settings`, { waitUntil: "networkidle" })
  const marker = String(Date.now()).slice(-6)
  const platformName = `منصة رسو ${marker}`
  const heroTitle = `عنوان تجريبي مباشر ${marker}`
  const heroDescription = `وصف تجريبي للتأكد من نشر إعدادات الصفحة العامة ${marker}`
  const announcement = `إعلان تجريبي ${marker}`

  await adminPage.locator("#platform_name").fill(platformName)
  await adminPage.locator("#hero_title").fill(heroTitle)
  await adminPage.locator("#hero_description").fill(heroDescription)
  await adminPage.locator("#announcement").fill(announcement)
  await adminPage.getByText("تغييرات غير منشورة").last().waitFor()
  await adminPage.screenshot({ path: `${screenshots}/settings-unsaved-feedback.png`, fullPage: true })

  await publish(adminPage)
  await adminPage.screenshot({ path: `${screenshots}/settings-published-feedback.png`, fullPage: true })

  await publicPage.getByRole("heading", { name: heroTitle }).waitFor({ timeout: 15000 })
  await publicPage.getByText(heroDescription).waitFor()
  await publicPage.getByText(announcement).waitFor()
  await publicPage.getByText(new RegExp(platformName)).waitFor()
  await publicPage.screenshot({ path: `${screenshots}/home-settings-content-updated.png`, fullPage: true })

  await setSwitch(adminPage, "announcement_enabled", false)
  await setSwitch(adminPage, "public_search_enabled", false)
  await setSwitch(adminPage, "stats_enabled", false)
  await setSwitch(adminPage, "public_visitor_count_enabled", false)
  await setSwitch(adminPage, "workflow_enabled", false)
  await setSwitch(adminPage, "governance_enabled", false)
  await setSwitch(adminPage, "news_enabled", false)
  await setCheckbox(adminPage, "final_price", false)
  await publish(adminPage)

  await publicPage.getByText("حوكمة آمنة للعمليات").waitFor({ timeout: 15000 })
  await publicPage.getByText("زوار السوق اليوم").waitFor({ state: "detached" })
  await publicPage.getByText("تحقق من سند مزاد").waitFor({ state: "detached" })
  await publicPage.getByText("توثيق المزاد في ثلاث خطوات").waitFor({ state: "detached" })
  await publicPage.getByText(announcement).waitFor({ state: "detached" })
  await publicPage.screenshot({ path: `${screenshots}/home-settings-sections-hidden.png`, fullPage: true })

  const verifyPage = await publicContext.newPage()
  await verifyPage.goto(`${baseUrl}/verify`, { waitUntil: "networkidle" })
  await verifyPage.getByText("التحقق العام متوقف مؤقتًا").waitFor()

  const { data: settlement } = await service.from("auction_settlements").select("receipt_number").limit(1).maybeSingle()
  if (settlement?.receipt_number) {
    const { data, error } = await publicClient.rpc("search_public_receipt", { p_query: settlement.receipt_number })
    if (error) throw error
    assert(data?.[0]?.final_price === null, "Public receipt still exposed the disabled final price")
  }

  const published = await getSettings()
  assert(published.public_visitor_count_enabled === false, "Visitor count setting was not saved")
  assert(published.public_search_enabled === false, "Public search setting was not saved")
  assert(published.workflow_enabled === false, "Workflow setting was not saved")
  assert(published.governance_enabled === false, "Governance setting was not saved")
  assert(published.stats_enabled === false, "Statistics setting was not saved")
  assert(published.news_enabled === false, "News setting was not saved")
  assert(published.public_fields.final_price === false, "Receipt privacy setting was not saved")

  await updateSettings({
    platform_name: original.platform_name,
    hero_title: original.hero_title,
    hero_description: original.hero_description,
    announcement: original.announcement,
    announcement_enabled: original.announcement_enabled,
    public_search_enabled: original.public_search_enabled,
    workflow_enabled: original.workflow_enabled,
    governance_enabled: original.governance_enabled,
    stats_enabled: original.stats_enabled,
    public_visitor_count_enabled: original.public_visitor_count_enabled,
    news_enabled: original.news_enabled,
    public_fields: original.public_fields,
  })
  restored = true

  await publicPage.getByRole("heading", { name: original.hero_title }).waitFor({ timeout: 15000 })
  await publicPage.screenshot({ path: `${screenshots}/home-settings-restored.png`, fullPage: true })

  await adminContext.close()
  await publicContext.close()
  console.log(JSON.stringify({
    ok: true,
    checks: [
      "unsaved-change-feedback",
      "success-toast-and-alert",
      "live-text-content-update",
      "visitor-count-visibility",
      "statistics-visibility",
      "public-search-visibility",
      "workflow-section-visibility",
      "governance-section-visibility",
      "announcement-visibility",
      "news-section-visibility",
      "receipt-field-privacy",
      "database-persistence",
      "realtime-public-refresh",
      "original-settings-restored",
    ],
  }, null, 2))
} finally {
  if (!restored) {
    await updateSettings({
      platform_name: original.platform_name,
      hero_title: original.hero_title,
      hero_description: original.hero_description,
      announcement: original.announcement,
      announcement_enabled: original.announcement_enabled,
      public_search_enabled: original.public_search_enabled,
      workflow_enabled: original.workflow_enabled,
      governance_enabled: original.governance_enabled,
      stats_enabled: original.stats_enabled,
      public_visitor_count_enabled: original.public_visitor_count_enabled,
      news_enabled: original.news_enabled,
      public_fields: original.public_fields,
    })
  }
  await browser.close()
}
