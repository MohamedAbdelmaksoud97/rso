import { chromium } from "playwright-core"
import { mkdir, readFile, stat } from "node:fs/promises"
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
const pdfOutput = resolve("tmp/pdfs/gatekeeper-receipt.pdf")

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

await mkdir(screenshots, { recursive: true })
await mkdir(resolve("tmp/pdfs"), { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
})

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()

  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" })
  await page.locator("#email").fill(env.RSO_GATEKEEPER_EMAIL)
  await page.locator("#password").fill(env.RSO_GATEKEEPER_PASSWORD)
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith("/dashboard"), { timeout: 20_000 }),
    page.getByRole("button", { name: "دخول إلى المنصة" }).click(),
  ])

  await page.goto(`${baseUrl}/dashboard/receipts`, { waitUntil: "networkidle" })
  const receiptLink = page.locator('a[href^="/dashboard/receipts/"]').first()
  const receiptHref = await receiptLink.getAttribute("href")
  assert(receiptHref, "لم يُعثر على سند متاح لحساب البواب")

  await page.goto(`${baseUrl}${receiptHref}`, { waitUntil: "networkidle" })
  await page.getByRole("heading", { name: "سند ترسية مزاد" }).waitFor()
  const printButton = page.getByRole("button", { name: "طباعة السند" })
  await printButton.waitFor()
  await page.evaluate(() => {
    window.print = () => { document.documentElement.dataset.printCalled = "true" }
  })
  await printButton.click()
  assert(await page.locator("html").getAttribute("data-print-called") === "true", "زر طباعة السند لم يستدعِ نافذة الطباعة")

  await page.emulateMedia({ media: "print" })
  const printMetrics = await page.evaluate(() => {
    const sheet = document.querySelector("[data-receipt-sheet]") ?? document.querySelector("[data-print-sheet]")
    const rect = sheet?.getBoundingClientRect()
    const header = document.querySelector("[data-dashboard-header]")
    const sidebar = document.querySelector('[data-slot="sidebar"]')
    return {
      sheetWidth: Math.round(rect?.width ?? 0),
      sheetHeight: Math.round(rect?.height ?? 0),
      dashboardHeaderVisible: header ? getComputedStyle(header).display !== "none" : false,
      sidebarVisible: sidebar ? getComputedStyle(sidebar).display !== "none" : false,
    }
  })

  await page.screenshot({ path: resolve(screenshots, "gatekeeper-receipt-print.png"), fullPage: true })
  const pdfBuffer = await page.pdf({
    path: pdfOutput,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  })
  const pdf = await stat(pdfOutput)
  const pdfPageCount = pdfBuffer.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0

  assert(pdf.size > 10_000, `ملف السند أصغر من المتوقع: ${pdf.size} bytes`)
  assert(pdfPageCount === 1, `يجب أن يكون السند صفحة واحدة، العدد الحالي: ${pdfPageCount}`)
  assert(!printMetrics.dashboardHeaderVisible, "رأس لوحة التحكم ظاهر في الطباعة")
  assert(!printMetrics.sidebarVisible, "الشريط الجانبي ظاهر في الطباعة")

  console.log(JSON.stringify({
    ok: true,
    checks: ["gatekeeper-access", "receipt-print-action", "single-a4-page", "dashboard-chrome-hidden"],
    receipt: receiptHref.split("/").at(-1),
    pdfPageCount,
    pdfBytes: pdf.size,
    printMetrics,
    screenshot: "gatekeeper-receipt-print.png",
  }, null, 2))

  await context.close()
} finally {
  await browser.close()
}
