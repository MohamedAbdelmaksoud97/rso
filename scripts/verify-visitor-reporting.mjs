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
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const screenshots = resolve("artifacts/screenshots")
await mkdir(screenshots, { recursive: true })

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function pass(feature, detail) {
  console.log(`PASS | ${feature} | ${detail}`)
}

async function waitFor(check, message, timeout = 10_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeout) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(message)
}

async function login(browser, email, password) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
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

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
})
let entryId
let originalSettings

try {
  const { data: settings, error: settingsError } = await service.from("site_settings").select("*").eq("id", true).single()
  if (settingsError) throw settingsError
  originalSettings = settings

  const gatekeeper = await login(browser, env.RSO_GATEKEEPER_EMAIL, env.RSO_GATEKEEPER_PASSWORD)
  await gatekeeper.page.goto(`${baseUrl}/dashboard/entries/new`, { waitUntil: "networkidle" })
  await gatekeeper.page.locator("#entry_kind").selectOption("visitor")
  assert(!await gatekeeper.page.locator("#person_name").evaluate((element) => element.required), "Visitor name is still required")
  assert(!await gatekeeper.page.locator("#mobile_or_id").evaluate((element) => element.required), "Visitor mobile is still required")
  await Promise.all([
    gatekeeper.page.waitForURL(/\/dashboard\/entries\/\d+$/, { timeout: 20_000 }),
    gatekeeper.page.getByRole("button", { name: "تسجيل دخول الزائر" }).click(),
  ])
  entryId = Number(new URL(gatekeeper.page.url()).pathname.split("/").at(-1))
  await gatekeeper.page.getByText("زائر غير مسمى").waitFor()
  const { data: entry, error: entryError } = await service.from("market_entries").select("entry_kind,person_name,mobile_or_id").eq("id", entryId).single()
  if (entryError) throw entryError
  assert(entry.entry_kind === "visitor" && entry.person_name === null && entry.mobile_or_id === null, "Optional visitor data was not stored as null")
  pass("تسجيل زائر دون بيانات", "نجح التسجيل وحُفظ الاسم والجوال كقيم اختيارية فارغة")
  await gatekeeper.context.close()

  const admin = await login(browser, env.RSO_ADMIN_EMAIL, env.RSO_ADMIN_PASSWORD)
  await admin.page.goto(`${baseUrl}/dashboard/admin/reports`, { waitUntil: "networkidle" })
  await admin.page.getByRole("heading", { name: "حركة الزوار اليومية" }).waitFor()
  const { data: reportRows, error: reportError } = await service.from("daily_attendance_summary").select("visitors_count,total_entries").order("business_date", { ascending: false }).limit(1)
  if (reportError) throw reportError
  assert(Number(reportRows[0]?.visitors_count) >= 1, "Daily visitor report did not count the new visit")
  await admin.page.screenshot({ path: resolve(screenshots, "visitor-attendance-report.png"), fullPage: true })
  pass("تقرير الحضور اليومي", `ظهر التقرير وسجل ${reportRows[0].visitors_count} زائراً في أحدث يوم`)

  await admin.page.goto(`${baseUrl}/dashboard/admin/settings`, { waitUntil: "networkidle" })
  const statsSwitch = admin.page.locator("#stats_enabled")
  const visitorSwitch = admin.page.locator("#public_visitor_count_enabled")
  if (!await statsSwitch.isChecked()) await admin.page.getByText("إظهار إحصاءات السوق", { exact: true }).click()
  if (!await visitorSwitch.isChecked()) await admin.page.getByText("إظهار عدد زوار اليوم", { exact: true }).click()
  await admin.page.getByRole("button", { name: "حفظ ونشر الإعدادات" }).click()
  await waitFor(async () => {
    const { data } = await service.from("site_settings").select("stats_enabled,public_visitor_count_enabled").eq("id", true).single()
    return data?.stats_enabled === true && data?.public_visitor_count_enabled === true
  }, "Public visitor count was not enabled")

  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const publicPage = await publicContext.newPage()
  await publicPage.goto(baseUrl, { waitUntil: "networkidle" })
  await publicPage.getByText("زوار السوق اليوم", { exact: true }).waitFor()
  await publicPage.screenshot({ path: resolve(screenshots, "home-visitor-count.png"), fullPage: true })
  pass("إظهار عدد الزوار في الرئيسية", "ظهر المؤشر العام بعد تفعيله من لوحة المدير")

  await admin.page.goto(`${baseUrl}/dashboard/admin/settings`, { waitUntil: "networkidle" })
  await admin.page.getByText("إظهار عدد زوار اليوم", { exact: true }).click()
  assert(!await admin.page.locator("#public_visitor_count_enabled").isChecked(), "Visitor count switch did not turn off")
  await admin.page.getByRole("button", { name: "حفظ ونشر الإعدادات" }).click()
  await waitFor(async () => {
    const { data } = await service.from("site_settings").select("public_visitor_count_enabled").eq("id", true).single()
    return data?.public_visitor_count_enabled === false
  }, "Public visitor count was not disabled")
  await publicPage.reload({ waitUntil: "networkidle" })
  assert(await publicPage.getByText("زوار السوق اليوم", { exact: true }).count() === 0, "Visitor count remained visible after disabling it")
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const { data: publicStats, error: statsError } = await anon.rpc("get_public_market_stats")
  if (statsError) throw statsError
  const publicRow = Array.isArray(publicStats) ? publicStats[0] : publicStats
  assert(Number(publicRow?.visitors_today) === 0, "Disabled visitor count is still exposed by the public RPC")
  pass("إخفاء عدد الزوار ديناميكياً", "اختفى من الواجهة وأعاد المسار العام صفراً بعد تعطيله")

  await publicContext.close()
  await admin.context.close()
} finally {
  if (entryId) await service.from("market_entries").delete().eq("id", entryId)
  if (originalSettings) {
    await service.from("site_settings").update({
      platform_name: originalSettings.platform_name,
      hero_title: originalSettings.hero_title,
      hero_description: originalSettings.hero_description,
      announcement: originalSettings.announcement,
      public_fields: originalSettings.public_fields,
      stats_enabled: originalSettings.stats_enabled,
      public_visitor_count_enabled: originalSettings.public_visitor_count_enabled,
      updated_by: originalSettings.updated_by,
    }).eq("id", true)
  }
  await browser.close()
}
