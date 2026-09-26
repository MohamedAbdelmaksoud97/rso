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

async function assertDialogAccessible(page, label) {
  await page.addScriptTag({ path: resolve("node_modules/axe-core/axe.min.js") })
  const violations = await page.evaluate(async () => {
    const dialog = document.querySelector('[role="dialog"]')
    if (!dialog) return [{ id: "dialog-missing" }]
    const result = await window.axe.run(dialog)
    return result.violations.map((violation) => ({ id: violation.id, impact: violation.impact }))
  })
  assert(violations.length === 0, `${label}: ${JSON.stringify(violations)}`)
}

await mkdir(screenshots, { recursive: true })
const runId = String(Date.now()).slice(-9)
const originalName = `مشتري إدارة ${runId}`
const updatedName = `مشتري محدّث ${runId}`
const originalPhone = `05${runId}`
const updatedPhone = `06${runId}`
const nationalId = `70${runId}`
let buyerId

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
})

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" })
  await page.locator("#email").fill(env.RSO_ADMIN_EMAIL)
  await page.locator("#password").fill(env.RSO_ADMIN_PASSWORD)
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 20_000 }),
    page.getByRole("button", { name: "دخول إلى المنصة" }).click(),
  ])

  await page.goto(`${baseUrl}/dashboard/admin/buyers`, { waitUntil: "networkidle" })
  await page.locator("#full_name").fill(originalName)
  await page.locator("#phone").fill(originalPhone)
  await page.locator("#national_id").fill(nationalId)
  await page.getByRole("button", { name: "إضافة واعتماد" }).click()
  await page.getByText("تمت إضافة المشتري واعتماده بنجاح.", { exact: true }).first().waitFor()

  let row = page.getByRole("row").filter({ hasText: originalName })
  await row.waitFor()
  const { data: createdBuyer, error: createdError } = await service.from("approved_buyers").select("id").eq("national_id", nationalId).single()
  if (createdError) throw createdError
  buyerId = createdBuyer.id

  const auctioneer = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: signInError } = await auctioneer.auth.signInWithPassword({ email: env.RSO_AUCTIONEER_EMAIL, password: env.RSO_AUCTIONEER_PASSWORD })
  if (signInError) throw signInError
  const unauthorizedDelete = await auctioneer.from("approved_buyers").delete().eq("id", buyerId).select("id")
  assert(Boolean(unauthorizedDelete.error) || unauthorizedDelete.data?.length === 0, "تمكن الدلال من حذف مشترٍ معتمد")
  const { data: protectedBuyer } = await service.from("approved_buyers").select("id").eq("id", buyerId).maybeSingle()
  assert(protectedBuyer?.id === buyerId, "حذف الدلال سجل المشتري رغم سياسة الحماية")

  await row.getByRole("button", { name: "تعديل" }).click()
  const editDialog = page.getByRole("dialog", { name: "تعديل بيانات المشتري" })
  await editDialog.waitFor()
  await editDialog.getByLabel("اسم المشتري").fill(updatedName)
  await editDialog.getByLabel("رقم الجوال").fill(updatedPhone)
  await assertDialogAccessible(page, "نافذة تعديل المشتري بها مشكلة وصول")
  await page.screenshot({ path: resolve(screenshots, "approved-buyer-edit-dialog.png"), fullPage: true })
  await editDialog.getByRole("button", { name: "حفظ التعديلات" }).click()
  await page.getByText("تم حفظ تعديلات المشتري بنجاح.", { exact: true }).first().waitFor()

  row = page.getByRole("row").filter({ hasText: updatedName })
  await row.waitFor()
  assert(await row.getByText(updatedPhone, { exact: true }).count() === 1, "لم يظهر رقم الجوال المعدّل في الجدول")
  const { data: updatedBuyer } = await service.from("approved_buyers").select("full_name,phone").eq("id", buyerId).single()
  assert(updatedBuyer?.full_name === updatedName && updatedBuyer?.phone === updatedPhone, "لم تُحفظ تعديلات المشتري في قاعدة البيانات")

  await row.getByRole("button", { name: "حذف" }).click()
  const deleteDialog = page.getByRole("dialog", { name: "حذف المشتري من الدليل؟" })
  await deleteDialog.waitFor()
  await deleteDialog.getByText("ستظل السندات السابقة محفوظة دون تغيير.", { exact: false }).waitFor()
  await assertDialogAccessible(page, "نافذة تأكيد الحذف بها مشكلة وصول")
  await page.screenshot({ path: resolve(screenshots, "approved-buyer-delete-confirmation.png"), fullPage: true })
  await deleteDialog.getByRole("button", { name: "تأكيد الحذف" }).click()
  await page.getByText("تم حذف المشتري من الدليل. تظل السندات السابقة محفوظة دون تغيير.", { exact: true }).first().waitFor()
  await page.getByRole("row").filter({ hasText: updatedName }).waitFor({ state: "detached" })
  const { data: deletedBuyer } = await service.from("approved_buyers").select("id").eq("id", buyerId).maybeSingle()
  assert(!deletedBuyer, "ما زال المشتري موجودًا في قاعدة البيانات بعد الحذف")
  buyerId = undefined

  await page.screenshot({ path: resolve(screenshots, "approved-buyers-after-delete.png"), fullPage: true })

  console.log(JSON.stringify({
    ok: true,
    checks: [
      "admin-create-buyer",
      "auctioneer-delete-denied",
      "edit-dialog",
      "database-update",
      "delete-confirmation",
      "database-delete",
      "arabic-feedback",
      "accessible-dialogs",
    ],
    screenshots: ["approved-buyer-edit-dialog.png", "approved-buyer-delete-confirmation.png", "approved-buyers-after-delete.png"],
  }, null, 2))

  await context.close()
} finally {
  if (buyerId) await service.from("approved_buyers").delete().eq("id", buyerId)
  await browser.close()
}
