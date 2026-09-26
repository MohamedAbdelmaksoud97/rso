import axe from "axe-core"
import { chromium } from "playwright-core"
import { createClient } from "@supabase/supabase-js"
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
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
await mkdir(screenshots, { recursive: true })

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function login(browser, email, password) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" })
  const page = await context.newPage()
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" })
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 20_000 }),
    page.locator('button[type="submit"]').click(),
  ])
  return { context, page }
}

async function assertAccessible(page, label) {
  await page.addScriptTag({ content: axe.source })
  const result = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } }))
  assert(result.violations.length === 0, `${label} has accessibility violations: ${result.violations.map((item) => item.id).join(", ")}`)
}

const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" })
const suffix = Date.now()
const initialTitle = `اختبار إعلان المنصة ${suffix}`
const updatedTitle = `${initialTitle} محدث`
let postId
let originalNewsEnabled = true

try {
  const { data: settings } = await service.from("site_settings").select("news_enabled").eq("id", true).single()
  originalNewsEnabled = settings?.news_enabled ?? true
  await service.from("site_settings").update({ news_enabled: true }).eq("id", true)

  const admin = await login(browser, env.RSO_ADMIN_EMAIL, env.RSO_ADMIN_PASSWORD)
  const page = admin.page
  await page.goto(`${baseUrl}/dashboard/admin/content`, { waitUntil: "networkidle" })
  await page.locator("#kind").selectOption("announcement")
  await page.locator("#title").fill(initialTitle)
  await page.locator("#summary").fill("إعلان اختباري للتأكد من ظهور المحتوى المنشور للزوار بطريقة صحيحة وآمنة.")
  await page.locator("#body").fill("هذه تفاصيل الإعلان الاختباري. يتم حذف هذا المحتوى تلقائيًا بعد اكتمال الفحص الشامل.")
  await page.getByRole("switch", { name: "محتوى بارز" }).click()
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/dashboard/admin/content" && url.searchParams.has("success"), { timeout: 20_000 }),
    page.getByRole("button", { name: "حفظ المحتوى" }).click(),
  ])
  await page.getByText(initialTitle, { exact: true }).waitFor()
  const { data: created } = await service.from("content_posts").select("id").eq("title", initialTitle).single()
  postId = created.id
  await assertAccessible(page, "content management")
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: resolve(screenshots, "content-management-admin.png"), fullPage: true })

  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" })
  const publicPage = await publicContext.newPage()
  await publicPage.goto(baseUrl, { waitUntil: "networkidle" })
  await publicPage.getByText(initialTitle, { exact: true }).waitFor()
  const section = publicPage.locator("#latest-news")
  await section.screenshot({ path: resolve(screenshots, "homepage-news-section.png") })
  await publicPage.locator(`a[href="/news/${postId}"]`).click()
  await publicPage.waitForURL((url) => url.pathname === `/news/${postId}`)
  await publicPage.getByRole("heading", { name: initialTitle }).waitFor()
  await assertAccessible(publicPage, "public content detail")
  await publicPage.screenshot({ path: resolve(screenshots, "public-news-detail.png"), fullPage: true })
  await publicPage.setViewportSize({ width: 360, height: 800 })
  await publicPage.reload({ waitUntil: "networkidle" })
  let publicMobile = await publicPage.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }))
  assert(publicMobile.page <= publicMobile.viewport + 1, `Public content detail overflows on mobile: ${publicMobile.page}px`)
  await publicPage.goto(baseUrl, { waitUntil: "networkidle" })
  publicMobile = await publicPage.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }))
  assert(publicMobile.page <= publicMobile.viewport + 1, `Homepage news section overflows on mobile: ${publicMobile.page}px`)
  await publicPage.setViewportSize({ width: 1440, height: 1000 })

  await page.goto(`${baseUrl}/dashboard/admin/content?edit=${postId}`, { waitUntil: "networkidle" })
  await page.locator("#title").fill(updatedTitle)
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/dashboard/admin/content" && url.searchParams.has("success"), { timeout: 20_000 }),
    page.getByRole("button", { name: "حفظ التعديلات" }).click(),
  ])
  await page.getByText(updatedTitle, { exact: true }).waitFor()

  await page.goto(`${baseUrl}/dashboard/admin/settings`, { waitUntil: "networkidle" })
  const newsSwitch = page.getByRole("switch", { name: "إظهار الأخبار والإعلانات" })
  assert(await newsSwitch.isChecked(), "News section switch should be enabled during the test")
  await newsSwitch.click()
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/dashboard/admin/settings" && url.searchParams.has("success"), { timeout: 20_000 }),
    page.getByRole("button", { name: "حفظ ونشر" }).click(),
  ])
  await publicPage.goto(baseUrl, { waitUntil: "networkidle" })
  assert(await publicPage.locator("#latest-news").count() === 0, "News section remained visible after the manager disabled it")

  await page.goto(`${baseUrl}/dashboard/admin/settings`, { waitUntil: "networkidle" })
  await page.getByRole("switch", { name: "إظهار الأخبار والإعلانات" }).click()
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/dashboard/admin/settings" && url.searchParams.has("success"), { timeout: 20_000 }),
    page.getByRole("button", { name: "حفظ ونشر" }).click(),
  ])
  await publicPage.goto(baseUrl, { waitUntil: "networkidle" })
  await publicPage.getByText(updatedTitle, { exact: true }).waitFor()

  await page.goto(`${baseUrl}/dashboard/admin/content`, { waitUntil: "networkidle" })
  const row = page.locator("tr").filter({ hasText: updatedTitle })
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/dashboard/admin/content" && url.searchParams.has("success"), { timeout: 20_000 }),
    row.getByRole("button", { name: "إخفاء" }).click(),
  ])
  await publicPage.goto(baseUrl, { waitUntil: "networkidle" })
  assert(await publicPage.getByText(updatedTitle, { exact: true }).count() === 0, "Hidden content is still visible on the homepage")
  await publicPage.goto(`${baseUrl}/news/${postId}`, { waitUntil: "networkidle" })
  assert(await publicPage.getByText(updatedTitle, { exact: true }).count() === 0, "Hidden content is accessible through its public URL")

  const anonymous = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const { data: hiddenRows, error: hiddenReadError } = await anonymous.from("content_posts").select("id").eq("id", postId)
  if (hiddenReadError) throw hiddenReadError
  assert(hiddenRows.length === 0, "RLS exposed hidden content to anonymous visitors")

  const staff = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const { data: staffAuth, error: staffAuthError } = await staff.auth.signInWithPassword({ email: env.RSO_AUCTIONEER_EMAIL, password: env.RSO_AUCTIONEER_PASSWORD })
  if (staffAuthError) throw staffAuthError
  const { error: staffInsertError } = await staff.from("content_posts").insert({ kind: "news", title: "محاولة غير مصرح بها", summary: "يجب أن ترفض قاعدة البيانات هذه المحاولة بالكامل.", body: "هذا المحتوى لا يجب أن يتم حفظه في قاعدة البيانات.", created_by: staffAuth.user.id, updated_by: staffAuth.user.id })
  assert(staffInsertError, "Non-admin staff was able to create public content")

  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto(`${baseUrl}/dashboard/admin/content`, { waitUntil: "networkidle" })
  const mobile = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }))
  assert(mobile.page <= mobile.viewport + 1, `Content management overflows on mobile: ${mobile.page}px`)

  console.log(JSON.stringify({ ok: true, checks: ["create-and-publish", "public-homepage", "public-detail", "edit", "section-visibility-setting", "unpublish", "rls-admin-only", "accessibility", "mobile-responsive"], postId }, null, 2))
  await publicContext.close()
  await admin.context.close()
} finally {
  if (postId) {
    await service.from("activity_events").delete().eq("entity_type", "content_post").eq("entity_id", String(postId))
    await service.from("content_posts").delete().eq("id", postId)
  }
  await service.from("site_settings").update({ news_enabled: originalNewsEnabled }).eq("id", true)
  await browser.close()
}
