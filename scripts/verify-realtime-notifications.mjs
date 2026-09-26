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
const runId = String(Date.now()).slice(-8)
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const cleanupIds = []
await mkdir(screenshots, { recursive: true })

function assert(condition, message) {
  if (!condition) throw new Error(message)
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

async function authenticatedClient(email, password) {
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  assert(data.user, `لم يتم تسجيل جلسة ${email}`)
  return { client, user: data.user }
}

async function verifyRole(browser, role, email, password, screenshotName) {
  const session = await authenticatedClient(email, password)
  const browserSession = await login(browser, email, password)
  const { page, context } = browserSession

  const notificationsButton = page.getByRole("button", { name: "الإشعارات", exact: true })
  await notificationsButton.click()
  const dialog = page.getByRole("dialog", { name: "الإشعارات" })
  await dialog.getByText("متصل لحظيًا").waitFor({ timeout: 20_000 })
  await dialog.getByRole("button", { name: "إغلاق" }).click()

  const entityId = `notification-${role}-${runId}`
  cleanupIds.push(entityId)
  const summary = `اختبار إشعار ${role} ${runId}`
  const { error } = await session.client.from("activity_events").insert({
    event_type: "notification_verification",
    actor_id: session.user.id,
    entity_type: "system_check",
    entity_id: entityId,
    summary,
  })
  if (error) throw error

  const unreadButton = page.getByRole("button", { name: /الإشعارات، \d+ غير مقروءة/ })
  await unreadButton.waitFor({ timeout: 15_000 })
  await page.locator('[data-slot="toast-description"]').filter({ hasText: summary }).waitFor({ timeout: 15_000 })
  await unreadButton.click()
  await dialog.locator("article").getByText(summary, { exact: true }).waitFor()
  await dialog.screenshot({ path: resolve(screenshots, screenshotName) })

  await context.close()
}

const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" })

try {
  await verifyRole(browser, "المدير", env.RSO_ADMIN_EMAIL, env.RSO_ADMIN_PASSWORD, "notifications-admin-realtime.png")
  await verifyRole(browser, "البواب", env.RSO_GATEKEEPER_EMAIL, env.RSO_GATEKEEPER_PASSWORD, "notifications-gatekeeper-realtime.png")
  await verifyRole(browser, "الدلال", env.RSO_AUCTIONEER_EMAIL, env.RSO_AUCTIONEER_PASSWORD, "notifications-auctioneer-realtime.png")
  console.log(JSON.stringify({
    ok: true,
    checks: ["admin-realtime-notification", "gatekeeper-own-realtime-notification", "auctioneer-own-realtime-notification", "unread-counter", "arabic-toast", "accessible-dialog"],
    screenshots: ["notifications-admin-realtime.png", "notifications-gatekeeper-realtime.png", "notifications-auctioneer-realtime.png"],
  }, null, 2))
} finally {
  if (cleanupIds.length) await service.from("activity_events").delete().in("entity_id", cleanupIds)
  await browser.close()
}
