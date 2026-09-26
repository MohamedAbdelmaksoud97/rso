import { chromium } from "playwright-core"
import { createClient } from "@supabase/supabase-js"
import { mkdir, readFile, rm, stat } from "node:fs/promises"
import { resolve } from "node:path"

const env = Object.fromEntries(
  (await readFile(".env.local", "utf8")).split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
    const separator = line.indexOf("=")
    return [line.slice(0, separator), line.slice(separator + 1)]
  }),
)

const baseUrl = "http://localhost:3000"
const screenshots = resolve("artifacts/screenshots")
const pdfOutput = resolve("output/pdf/rsu-admin-report.pdf")
const temporaryCsv = resolve("tmp/reports/rsu-report.csv")

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

await mkdir(screenshots, { recursive: true })
await mkdir(resolve("output/pdf"), { recursive: true })
await mkdir(resolve("tmp/reports"), { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
})

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true })
  const page = await context.newPage()
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" })
  await page.locator("#email").fill(env.RSO_ADMIN_EMAIL)
  await page.locator("#password").fill(env.RSO_ADMIN_PASSWORD)
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith("/dashboard"), { timeout: 20_000 }),
    page.getByRole("button", { name: "دخول إلى المنصة" }).click(),
  ])

  await page.goto(`${baseUrl}/dashboard/admin/reports`, { waitUntil: "networkidle" })
  await page.getByRole("heading", { name: "تقارير الأداء والتشغيل" }).waitFor()
  for (const label of ["قيمة المبيعات", "الصفقات الموثقة", "متوسط سعر الترسية", "عمولة المنصة", "إجمالي الدخول", "الوزن المسجل", "معدل الترسية", "الموظفون المعتمدون"]) {
    await page.getByText(label, { exact: true }).first().waitFor()
  }
  for (const tab of ["نظرة عامة", "الصفقات", "الحضور", "الفريق والنظام", "الأصناف", "المشترون"]) {
    await page.getByRole("tab", { name: tab }).waitFor()
  }
  await page.screenshot({ path: resolve(screenshots, "admin-reports-overview.png"), fullPage: true })

  await page.getByLabel("فترة سريعة").selectOption("7")
  const fromValue = await page.getByLabel("من تاريخ").inputValue()
  const toValue = await page.getByLabel("إلى تاريخ").inputValue()
  assert(fromValue < toValue, "Quick range did not update the dates")
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/dashboard/admin/reports" && url.searchParams.get("from") === fromValue && url.searchParams.get("to") === toValue, { timeout: 20_000 }),
    page.getByRole("button", { name: "تحديث التقرير" }).click(),
  ])

  await page.getByRole("tab", { name: "الصفقات" }).click()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "تصدير CSV" }).click()
  const download = await downloadPromise
  await download.saveAs(temporaryCsv)
  const csv = await readFile(temporaryCsv)
  assert(csv[0] === 0xef && csv[1] === 0xbb && csv[2] === 0xbf, "CSV is missing the UTF-8 BOM")
  const csvText = csv.toString("utf8")
  assert(csvText.includes("رقم السند") && csvText.includes("سعر الترسية"), "CSV headers are incomplete")
  await page.getByText("تم تصدير التقرير").waitFor()

  await page.getByRole("tab", { name: "الفريق والنظام" }).click()
  await page.getByText("أداء الدلالين").waitFor()
  await page.getByText("أداء البوابين").waitFor()
  await page.screenshot({ path: resolve(screenshots, "admin-reports-team.png"), fullPage: true })

  await page.getByRole("tab", { name: "نظرة عامة" }).click()
  await page.evaluate(() => {
    window.print = () => { document.documentElement.dataset.printCalled = "true" }
  })
  await page.getByRole("button", { name: "طباعة / حفظ PDF" }).click()
  assert(await page.locator("html").getAttribute("data-print-called") === "true", "Print action was not called")
  await page.getByText("التقرير جاهز للطباعة").waitFor()

  await page.emulateMedia({ media: "print" })
  const printMetrics = await page.evaluate(() => {
    const reportRoot = document.querySelector("[data-report-root]")
    const rootRect = reportRoot?.getBoundingClientRect()
    return {
      htmlHeight: document.documentElement.scrollHeight,
      bodyHeight: document.body.scrollHeight,
      reportTop: rootRect?.top ?? 0,
      reportBottom: rootRect?.bottom ?? 0,
      reportHeight: rootRect?.height ?? 0,
    }
  })
  await page.screenshot({ path: resolve(screenshots, "admin-reports-print-preview.png"), fullPage: true })
  const pdfBuffer = await page.pdf({
    path: pdfOutput,
    format: "A4",
    landscape: true,
    printBackground: true,
    margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
  })
  const pdf = await stat(pdfOutput)
  assert(pdf.size > 20_000, `Generated PDF is unexpectedly small: ${pdf.size} bytes`)
  const pdfPageCount = pdfBuffer.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0
  assert(pdfPageCount === 2, `Generated PDF should contain two pages, received ${pdfPageCount}`)
  await page.emulateMedia({ media: "screen" })

  await page.setViewportSize({ width: 360, height: 800 })
  await page.reload({ waitUntil: "networkidle" })
  const widths = await page.evaluate(() => ({ root: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }))
  assert(widths.root <= widths.viewport + 1, `Reports page overflows on mobile (${widths.root}px)`)

  const anonymous = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const { error: anonymousError } = await anonymous.rpc("get_admin_report", { p_start_date: fromValue, p_end_date: toValue })
  assert(anonymousError, "Anonymous access to the admin report RPC was allowed")

  await context.close()
  console.log(JSON.stringify({
    ok: true,
    checks: [
      "admin-report-access",
      "six-report-sections",
      "quick-and-custom-date-range",
      "arabic-csv-export",
      "print-action-feedback",
      "valid-pdf-generation",
      "mobile-responsive",
    "anonymous-rpc-denied",
    ],
    printMetrics,
    pdfPageCount,
    pdf: pdfOutput,
    screenshots: ["admin-reports-overview.png", "admin-reports-team.png", "admin-reports-print-preview.png"],
  }, null, 2))
} finally {
  await rm(temporaryCsv, { force: true })
  await browser.close()
}
