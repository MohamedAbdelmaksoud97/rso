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

await mkdir(screenshots, { recursive: true })
const runId = String(Date.now()).slice(-9)
const sellerName = `مورد صنف يدوي ${runId}`
const mobile = `05${runId}`
const customCommodity = `برحي تجريبي ${runId}`
let entryId

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
    page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 20_000 }),
    page.getByRole("button", { name: "دخول إلى المنصة" }).click(),
  ])

  await page.goto(`${baseUrl}/dashboard/entries/new`, { waitUntil: "networkidle" })
  const customInput = page.locator("#custom_commodity_type")
  assert(await customInput.count() === 0, "ظهر حقل الصنف اليدوي قبل اختيار «أخرى»")

  await page.locator("#commodity_type").selectOption("أخرى")
  await customInput.waitFor()
  assert(await customInput.getAttribute("required") !== null, "حقل الصنف اليدوي غير مطلوب")
  assert(await customInput.getAttribute("maxlength") === "80", "الحد الأقصى لحقل الصنف اليدوي غير مطبق")

  await page.locator("#person_name").fill(sellerName)
  await page.locator("#mobile_or_id").fill(mobile)
  await page.locator("#quantity").fill("12")
  await page.locator("#unit_label").selectOption("صندوق")
  await page.locator("#total_weight_kg").fill("145.5")
  await page.getByRole("button", { name: "تسجيل وإصدار QR" }).click()
  assert(new URL(page.url()).pathname === "/dashboard/entries/new", "سمح النموذج بالإرسال دون كتابة الصنف الآخر")
  assert(!(await customInput.evaluate((element) => element.checkValidity())), "لم يفعّل المتصفح التحقق من الصنف اليدوي")

  await customInput.evaluate((element) => element.removeAttribute("required"))
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/dashboard/entries/new" && url.searchParams.has("error"), { timeout: 20_000 }),
    page.getByRole("button", { name: "تسجيل وإصدار QR" }).click(),
  ])
  await page.getByRole("alert").getByText("اكتب نوع السلعة الأخرى من حرفين على الأقل.", { exact: true }).waitFor()

  await page.locator("#person_name").fill(sellerName)
  await page.locator("#mobile_or_id").fill(mobile)
  await page.locator("#commodity_type").selectOption("أخرى")
  await page.locator("#quantity").fill("12")
  await page.locator("#unit_label").selectOption("صندوق")
  await page.locator("#total_weight_kg").fill("145.5")
  const reloadedCustomInput = page.locator("#custom_commodity_type")
  await reloadedCustomInput.fill(customCommodity)

  await page.addScriptTag({ path: resolve("node_modules/axe-core/axe.min.js") })
  const violations = await page.evaluate(async () => {
    const form = document.querySelector("form")
    if (!form) return [{ id: "form-missing" }]
    const result = await window.axe.run(form)
    return result.violations.map((violation) => ({ id: violation.id, impact: violation.impact }))
  })
  assert(violations.length === 0, `نموذج الصنف اليدوي به مشكلات وصول: ${JSON.stringify(violations)}`)
  await page.screenshot({ path: resolve(screenshots, "gatekeeper-custom-commodity-form.png"), fullPage: true })

  await Promise.all([
    page.waitForURL((url) => /^\/dashboard\/entries\/\d+$/.test(url.pathname), { timeout: 20_000 }),
    page.getByRole("button", { name: "تسجيل وإصدار QR" }).click(),
  ])

  await page.getByText(customCommodity, { exact: true }).waitFor()
  assert(await page.getByText("أخرى", { exact: true }).count() === 0, "ظهرت القيمة العامة «أخرى» بدل اسم السلعة المكتوب")

  const { data: entry, error } = await service
    .from("market_entries")
    .select("id,entry_kind,person_name,mobile_or_id,commodity_type,quantity,unit_label,total_weight_kg,qr_token")
    .eq("mobile_or_id", mobile)
    .single()
  if (error) throw error
  entryId = entry.id

  assert(entry.entry_kind === "seller", "نوع الدخول المحفوظ ليس بائعًا")
  assert(entry.commodity_type === customCommodity, "لم تُحفظ قيمة الصنف اليدوي كما كُتبت")
  assert(entry.quantity === 12 && entry.unit_label === "صندوق", "لم تُحفظ بيانات الكمية والوحدة")
  assert(entry.total_weight_kg === 145.5, "لم يُحفظ الوزن الإجمالي")
  assert(Boolean(entry.qr_token), "لم يتم إصدار رمز QR للبضاعة")

  await page.screenshot({ path: resolve(screenshots, "gatekeeper-custom-commodity-entry.png"), fullPage: true })

  console.log(JSON.stringify({
    ok: true,
    checks: [
      "conditional-custom-field",
      "required-browser-validation",
      "server-validation",
      "accessible-form",
      "exact-database-value",
      "entry-card-value",
      "qr-issued",
    ],
    screenshots: ["gatekeeper-custom-commodity-form.png", "gatekeeper-custom-commodity-entry.png"],
  }, null, 2))

  await context.close()
} finally {
  if (entryId) {
    await service.from("activity_events").delete().eq("entity_type", "market_entry").eq("entity_id", String(entryId))
    await service.from("market_entries").delete().eq("id", entryId)
  }
  await browser.close()
}
