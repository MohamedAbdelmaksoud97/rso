import axe from "axe-core"
import { chromium } from "playwright-core"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

const env = Object.fromEntries(
  (await readFile(".env.local", "utf8")).split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
    const separator = line.indexOf("=")
    return [line.slice(0, separator), line.slice(separator + 1)]
  }),
)

const baseUrl = "http://localhost:3000"
const screenshots = resolve("artifacts/screenshots")
const reportPath = resolve("artifacts/accessibility-report.json")
const audit = []
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
    page.waitForURL((url) => url.pathname.startsWith("/dashboard"), { timeout: 20_000 }),
    page.getByRole("button", { name: "دخول إلى المنصة" }).click(),
  ])
  return { context, page }
}

async function scanDocument(page, label, path) {
  await page.addScriptTag({ content: axe.source })
  const result = await page.evaluate(async () => window.axe.run(document, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
    },
  }))
  audit.push({
    label,
    path,
    violations: result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
    })),
    incomplete: result.incomplete.length,
    passes: result.passes.length,
  })
}

async function scan(page, label, path) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" })
  assert(response?.ok(), `${label} returned ${response?.status()}`)
  await scanDocument(page, label, path)
}

async function verifyKeyboard(page, path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" })
  await page.locator("body").click({ position: { x: 1, y: 1 } })
  let focus = null
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.keyboard.press("Tab")
    focus = await page.evaluate(() => {
      const element = document.activeElement
      if (!(element instanceof HTMLElement) || element === document.body) return null
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        tag: element.tagName,
        text: element.innerText || element.getAttribute("aria-label") || "",
        visible: rect.width > 0 && rect.height > 0,
        indicator: style.outlineStyle !== "none" || style.boxShadow !== "none",
      }
    })
    if (focus?.visible) break
  }
  assert(focus?.visible, `${path} did not move keyboard focus to a visible control`)
  assert(focus.indicator, `${path} first keyboard target has no visible focus indicator: ${focus.tag} ${focus.text}`)
}

const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" })

try {
  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" })
  const publicPage = await publicContext.newPage()
  for (const [label, path] of [
    ["الرئيسية", "/"],
    ["تسجيل الدخول", "/auth/login"],
    ["إنشاء حساب", "/auth/register"],
    ["نسيت كلمة المرور", "/auth/forgot-password"],
    ["التحقق العام", "/verify"],
  ]) await scan(publicPage, label, path)
  await verifyKeyboard(publicPage, "/auth/login")
  await publicContext.close()

  const admin = await login(browser, env.RSO_ADMIN_EMAIL, env.RSO_ADMIN_PASSWORD)
  for (const [label, path] of [
    ["لوحة المدير", "/dashboard"],
    ["إدارة المستخدمين", "/dashboard/admin/users"],
    ["المشترون المعتمدون", "/dashboard/admin/buyers"],
    ["العمولات", "/dashboard/admin/commissions"],
    ["التقارير", "/dashboard/admin/reports"],
    ["إعدادات المنصة", "/dashboard/admin/settings"],
    ["سجل السندات للمدير", "/dashboard/receipts"],
    ["حساب المدير", "/dashboard/account"],
  ]) await scan(admin.page, label, path)
  await verifyKeyboard(admin.page, "/dashboard")
  await admin.page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" })
  await admin.page.getByRole("button", { name: "الإشعارات", exact: true }).click()
  await admin.page.getByRole("dialog", { name: "الإشعارات" }).waitFor()
  await scanDocument(admin.page, "نافذة الإشعارات", "/dashboard#notifications")
  await admin.page.getByRole("dialog", { name: "الإشعارات" }).getByRole("button", { name: "إغلاق" }).click()
  await admin.page.screenshot({ path: resolve(screenshots, "accessibility-admin-dashboard.png"), fullPage: true })
  await admin.context.close()

  const gatekeeper = await login(browser, env.RSO_GATEKEEPER_EMAIL, env.RSO_GATEKEEPER_PASSWORD)
  for (const [label, path] of [
    ["لوحة البواب", "/dashboard"],
    ["تسجيل الدخولات", "/dashboard/entries/new"],
    ["سجل سندات البواب", "/dashboard/receipts"],
    ["حساب البواب", "/dashboard/account"],
  ]) await scan(gatekeeper.page, label, path)
  await verifyKeyboard(gatekeeper.page, "/dashboard/entries/new")
  await gatekeeper.page.screenshot({ path: resolve(screenshots, "accessibility-gatekeeper-entry.png"), fullPage: true })
  await gatekeeper.context.close()

  const auctioneer = await login(browser, env.RSO_AUCTIONEER_EMAIL, env.RSO_AUCTIONEER_PASSWORD)
  for (const [label, path] of [
    ["لوحة الدلال", "/dashboard"],
    ["توثيق الترسية", "/dashboard/settlements/new"],
    ["عمولات الدلّال وتسوياته", "/dashboard/my-commissions"],
    ["سجل سندات الدلال", "/dashboard/receipts"],
    ["حساب الدلال", "/dashboard/account"],
  ]) await scan(auctioneer.page, label, path)
  await verifyKeyboard(auctioneer.page, "/dashboard/settlements/new")
  await auctioneer.page.screenshot({ path: resolve(screenshots, "accessibility-auctioneer-settlement.png"), fullPage: true })
  await auctioneer.context.close()

  await writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), pages: audit }, null, 2)}\n`, "utf8")
  const violations = audit.flatMap((page) => page.violations.map((violation) => ({ page: page.label, ...violation })))
  if (violations.length) {
    console.error(JSON.stringify({ ok: false, violations }, null, 2))
    throw new Error(`Accessibility audit found ${violations.length} violation groups across ${audit.length} pages`)
  }

  console.log(JSON.stringify({
    ok: true,
    pages: audit.length,
    violations: 0,
    checks: ["wcag-2a", "wcag-2aa", "wcag-21", "wcag-22", "keyboard-focus", "three-roles"],
    report: reportPath,
  }, null, 2))
} finally {
  await browser.close()
}
