import { chromium } from "playwright-core"
import { createClient } from "@supabase/supabase-js"
import { randomBytes } from "node:crypto"
import { readFile } from "node:fs/promises"

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
const runId = String(Date.now()).slice(-7)
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const results = []
const cleanup = { userIds: [], entryIds: [], settlementIds: [], buyerIds: [], activityEntityIds: [], commissionId: null }
let originalSettings
let originalCommission

function createTestPassword(label) {
  return `${label}-${randomBytes(18).toString("base64url")}!7aA`
}

function pass(feature, detail) {
  results.push({ feature, status: "PASS", detail })
  console.log(`PASS | ${feature} | ${detail}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function waitFor(check, message, timeout = 10000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeout) {
    const value = await check()
    if (value) return value
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(message)
}

async function login(browser, email, password) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["camera"],
    serviceWorkers: "allow",
  })
  const page = await context.newPage()
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" })
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith("/dashboard"), { timeout: 20000 }),
    page.getByRole("button", { name: "دخول إلى المنصة" }).click(),
  ])
  return { context, page }
}

async function createConfirmedPendingUser() {
  const email = `approved-ui-${runId}@rsu.sa`
  const password = createTestPassword("Approval")
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `موظف اعتماد ${runId}`, phone: `059${runId}` },
  })
  if (error) throw error
  cleanup.userIds.push(data.user.id)
  return { id: data.user.id, email, password }
}

async function createEntryForGatekeeper(gatekeeperId, suffix) {
  const { data, error } = await service.from("market_entries").insert({
    entry_kind: "seller",
    person_name: `مزرعة اختبار ${suffix}`,
    mobile_or_id: `058${runId}${suffix}`.slice(0, 12),
    commodity_type: "سكري",
    quantity: 40,
    unit_label: "صندوق",
    total_weight_kg: 320,
    notes: "اختبار شامل",
    gatekeeper_id: gatekeeperId,
  }).select("*").single()
  if (error) throw error
  cleanup.entryIds.push(data.id)
  return data
}

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
})

try {
  const [{ data: settings }, { data: commission }, { data: profiles }, { data: existingSettlement }] = await Promise.all([
    service.from("site_settings").select("*").eq("id", true).single(),
    service.from("commission_settings").select("*").eq("is_active", true).single(),
    service.from("profiles").select("id,role").eq("approval_status", "approved"),
    service.from("auction_settlements").select("receipt_number,market_entries(mobile_or_id)").order("settled_at", { ascending: false }).limit(1).single(),
  ])
  originalSettings = settings
  originalCommission = commission
  if (!settings.public_search_enabled) {
    const { error: enablePublicSearchError } = await service
      .from("site_settings")
      .update({ public_search_enabled: true })
      .eq("id", true)
    if (enablePublicSearchError) throw enablePublicSearchError
  }
  const adminProfile = profiles.find((profile) => profile.role === "admin")
  const gatekeeperProfile = profiles.find((profile) => profile.role === "gatekeeper")
  const auctioneerProfile = profiles.find((profile) => profile.role === "auctioneer")
  assert(adminProfile && gatekeeperProfile && auctioneerProfile, "The three operational roles are not ready")

  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "allow" })
  const publicPage = await publicContext.newPage()
  let response = await publicPage.goto(baseUrl, { waitUntil: "networkidle" })
  assert(response?.status() === 200, "Home page did not return 200")
  await publicPage.getByRole("heading", { level: 1 }).waitFor()
  await publicPage.getByText("تحقق من سند مزاد").waitFor()
  pass("الصفحة الرئيسية", "تعمل وتعرض المحتوى والبحث والإحصاءات الحقيقية")

  await publicPage.goto(`${baseUrl}/verify?q=${encodeURIComponent(existingSettlement.receipt_number)}`, { waitUntil: "networkidle" })
  await publicPage.getByText(existingSettlement.receipt_number).waitFor()
  await publicPage.getByText("موثق في منصة رسو").waitFor()
  pass("البحث العام برقم السند", "أعاد السند الموثق والحقول العامة")

  await publicPage.goto(`${baseUrl}/verify?q=${encodeURIComponent(existingSettlement.market_entries.mobile_or_id)}`, { waitUntil: "networkidle" })
  await publicPage.getByText(existingSettlement.receipt_number).waitFor()
  pass("البحث العام بالجوال", "أعاد السند المطابق لجوال المورد")

  await publicPage.goto(`${baseUrl}/verify?q=999999999999999`, { waitUntil: "networkidle" })
  await publicPage.getByText("لم نعثر على سند مطابق").waitFor()
  pass("البحث غير المطابق", "يعرض حالة فارغة واضحة دون كشف بيانات")

  await publicPage.goto(`${baseUrl}/dashboard/admin/users`, { waitUntil: "networkidle" })
  assert(new URL(publicPage.url()).pathname === "/auth/login", "Anonymous user reached a protected route")
  pass("حماية الصفحات دون تسجيل دخول", "أعادت المستخدم إلى صفحة الدخول")

  await publicPage.locator("#email").fill("wrong@example.com")
  await publicPage.locator("#password").fill(createTestPassword("Invalid"))
  await publicPage.getByRole("button", { name: "دخول إلى المنصة" }).click()
  await publicPage.getByText("تحقق من البريد وكلمة المرور ومن تفعيل بريدك الإلكتروني، ثم حاول مرة أخرى.").waitFor()
  pass("رفض بيانات الدخول الخاطئة", "ظهرت رسالة عربية ولم تُنشأ جلسة")
  await publicContext.close()

  const pendingUser = await createConfirmedPendingUser()
  const admin = await login(browser, env.RSO_ADMIN_EMAIL, env.RSO_ADMIN_PASSWORD)
  await admin.page.getByText("مدير النظام").first().waitFor()
  pass("دخول المدير", "وصل إلى لوحة العمليات بصلاحية المدير")

  const adminPages = [
    ["/dashboard/admin/users", "المستخدمون والاعتمادات"],
    ["/dashboard/admin/buyers", "المشترون المعتمدون"],
    ["/dashboard/admin/commissions", "العمولات والتسويات اليومية"],
    ["/dashboard/admin/reports", "تقارير الأداء والتشغيل"],
    ["/dashboard/admin/settings", "إعدادات الصفحة العامة"],
    ["/dashboard/receipts", "السندات والصفقات"],
    ["/dashboard/account", "الحساب والأمان"],
  ]
  for (const [path, heading] of adminPages) {
    response = await admin.page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" })
    assert(response?.status() === 200, `${path} failed for admin`)
    await admin.page.getByRole("heading", { name: heading }).waitFor()
  }
  pass("صفحات إدارة المدير", "المستخدمون والمشترون والعمولات والإعدادات والسندات والحساب تعمل")

  await admin.page.goto(`${baseUrl}/dashboard/admin/users`, { waitUntil: "networkidle" })
  const approvalRow = admin.page.getByRole("row").filter({ hasText: pendingUser.email })
  await approvalRow.locator('select[name="role"]').selectOption("auctioneer")
  await approvalRow.locator('select[name="approval_status"]').selectOption("approved")
  await approvalRow.getByRole("button", { name: "حفظ" }).click()
  await admin.page.waitForLoadState("networkidle")
  await waitFor(async () => {
    const { data } = await service.from("profiles").select("role,approval_status").eq("id", pendingUser.id).single()
    return data?.role === "auctioneer" && data?.approval_status === "approved"
  }, "Admin approval was not saved")
  pass("اعتماد الموظف وتحديد دوره", "اعتمد المدير حسابًا مفعّلًا وحدد دوره كدلّال")

  await admin.page.goto(`${baseUrl}/dashboard/admin/buyers`, { waitUntil: "networkidle" })
  const buyerName = `مشتري معتمد ${runId}`
  const buyerPhone = `057${runId}`
  const buyerNationalId = `70${runId}91`
  await admin.page.locator("#full_name").fill(buyerName)
  await admin.page.locator("#phone").fill(buyerPhone)
  await admin.page.locator("#national_id").fill(buyerNationalId)
  await admin.page.getByRole("button", { name: "إضافة واعتماد" }).click()
  await admin.page.waitForLoadState("networkidle")
  await admin.page.getByRole("row").filter({ hasText: buyerName }).waitFor()
  const { data: buyer } = await service.from("approved_buyers").select("id").eq("national_id", buyerNationalId).single()
  cleanup.buyerIds.push(buyer.id)
  pass("إضافة مشتري معتمد", "ظهر المشتري في الدليل وأصبح متاحًا للترسية")

  await admin.page.goto(`${baseUrl}/dashboard/admin/commissions`, { waitUntil: "networkidle" })
  await admin.page.locator("#auctioneer_rate_percent").fill("2.5")
  await admin.page.locator("#platform_rate_percent").fill("0.75")
  await admin.page.getByRole("button", { name: "تفعيل النسب الجديدة" }).click()
  await admin.page.waitForLoadState("networkidle")
  const changedCommission = await waitFor(async () => {
    const { data } = await service.from("commission_settings").select("*").eq("is_active", true).single()
    return Number(data?.auctioneer_rate_percent) === 2.5 && Number(data?.platform_rate_percent) === 0.75 ? data : null
  }, "Commission update failed")
  cleanup.commissionId = changedCommission.id
  cleanup.activityEntityIds.push(String(changedCommission.id))
  pass("العمولات الديناميكية", "تم تفعيل 2.5% للدلّال و0.75% للمنصة")

  await admin.page.goto(`${baseUrl}/dashboard/admin/settings`, { waitUntil: "networkidle" })
  const testHero = `توثيق اختبار ${runId}`
  const testAnnouncement = `إعلان اختبار ${runId}`
  await admin.page.locator("#hero_title").fill(testHero)
  await admin.page.locator("#announcement").fill(testAnnouncement)
  const announcementSwitch = admin.page.locator("#announcement_enabled")
  if (!await announcementSwitch.isChecked()) await admin.page.getByText("إظهار الشريط التعريفي", { exact: true }).click()
  const statsSwitch = admin.page.locator("#stats_enabled")
  if (await statsSwitch.isChecked()) await admin.page.getByText("إظهار إحصاءات السوق", { exact: true }).click()
  const finalPriceCheckbox = admin.page.locator("#final_price")
  if (await finalPriceCheckbox.isChecked()) await admin.page.getByText("سعر الترسية", { exact: true }).click()
  assert(!await statsSwitch.isChecked() && !await finalPriceCheckbox.isChecked(), "Settings controls did not toggle")
  await admin.page.getByRole("button", { name: "حفظ ونشر" }).click()
  await admin.page.waitForLoadState("networkidle")
  await waitFor(async () => {
    const { data } = await service.from("site_settings").select("*").eq("id", true).single()
    return data?.hero_title === testHero && data?.stats_enabled === false && data?.public_fields?.final_price === false
  }, "Site settings update failed")
  const settingsContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const settingsPage = await settingsContext.newPage()
  await settingsPage.goto(baseUrl, { waitUntil: "networkidle" })
  await settingsPage.getByRole("heading", { name: testHero }).waitFor()
  await settingsPage.getByText(testAnnouncement).waitFor()
  await settingsPage.goto(`${baseUrl}/verify?q=${encodeURIComponent(existingSettlement.receipt_number)}`, { waitUntil: "networkidle" })
  assert(await settingsPage.getByText("سعر الترسية").count() === 0, "Hidden public price is still visible")
  await settingsContext.close()
  pass("إعدادات الصفحة والخصوصية", "تغير المحتوى فورًا واختفى السعر العام وتعطلت الإحصاءات حسب الإعداد")

  await admin.page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" })
  await admin.page.getByText("متصل").waitFor({ timeout: 20000 })
  const realtimeProbe = `ui-realtime-${runId}`
  cleanup.activityEntityIds.push(realtimeProbe)
  const { error: realtimeInsertError } = await service.from("activity_events").insert({
    event_type: "ui_verification",
    actor_id: adminProfile.id,
    entity_type: "system_check",
    entity_id: realtimeProbe,
    summary: `حدث لحظي ${runId}`,
  })
  if (realtimeInsertError) throw realtimeInsertError
  await admin.page.getByRole("main").getByText(`حدث لحظي ${runId}`, { exact: true }).waitFor({ timeout: 20000 })
  pass("لوحة الإشراف Realtime", "استقبلت الحدث الجديد فورًا داخل واجهة المدير")
  await admin.context.close()

  const approvedEmployee = await login(browser, pendingUser.email, pendingUser.password)
  await approvedEmployee.page.getByText("دلّال").first().waitFor()
  pass("دخول الموظف بعد الاعتماد", "الحساب المعتمد دخل بالوظيفة التي حددها المدير")
  await approvedEmployee.context.close()

  const gatekeeper = await login(browser, env.RSO_GATEKEEPER_EMAIL, env.RSO_GATEKEEPER_PASSWORD)
  await gatekeeper.page.getByText("بوّاب").first().waitFor()
  assert(await gatekeeper.page.getByText("إعدادات المنصة").count() === 0, "Gatekeeper sees admin navigation")
  await gatekeeper.page.goto(`${baseUrl}/dashboard/admin/users`, { waitUntil: "networkidle" })
  assert(new URL(gatekeeper.page.url()).pathname === "/dashboard", "Gatekeeper reached admin users page")
  await gatekeeper.page.goto(`${baseUrl}/dashboard/settlements/new`, { waitUntil: "networkidle" })
  assert(new URL(gatekeeper.page.url()).pathname === "/dashboard", "Gatekeeper reached auctioneer settlement page")
  pass("صلاحيات البوّاب", "لا يرى أدوات المدير ولا يستطيع فتح صفحة الترسية")

  await gatekeeper.page.goto(`${baseUrl}/dashboard/entries/new`, { waitUntil: "networkidle" })
  await gatekeeper.page.locator("#entry_kind").selectOption("visitor")
  assert(await gatekeeper.page.locator("#commodity_type").count() === 0, "Visitor form still shows commodity fields")
  await gatekeeper.page.locator("#person_name").fill(`زائر اختبار ${runId}`)
  await gatekeeper.page.locator("#mobile_or_id").fill(`056${runId}`)
  await Promise.all([
    gatekeeper.page.waitForURL(/\/dashboard\/entries\/\d+$/, { timeout: 20000 }),
    gatekeeper.page.getByRole("button", { name: "تسجيل دخول الزائر" }).click(),
  ])
  const visitorEntryId = Number(new URL(gatekeeper.page.url()).pathname.split("/").pop())
  cleanup.entryIds.push(visitorEntryId)
  await gatekeeper.page.getByText("تم تسجيل دخول الزائر").waitFor()
  assert(await gatekeeper.page.locator("svg[viewBox='0 0 256 256']").count() === 0, "Visitor received a goods QR")
  pass("تسجيل الزائر", "حفظ بيانات الزيارة دون طلب بيانات بضاعة أو إصدار QR")

  await gatekeeper.page.goto(`${baseUrl}/dashboard/entries/new`, { waitUntil: "networkidle" })
  const sellerMobile = `055${runId}`
  await gatekeeper.page.locator("#person_name").fill(`مزارع اختبار ${runId}`)
  await gatekeeper.page.locator("#mobile_or_id").fill(sellerMobile)
  await gatekeeper.page.locator("#commodity_type").selectOption("خلاص")
  await gatekeeper.page.locator("#quantity").fill("75")
  await gatekeeper.page.locator("#unit_label").selectOption("صندوق")
  await gatekeeper.page.locator("#total_weight_kg").fill("600")
  await gatekeeper.page.locator("#notes").fill("اختبار دورة المزاد كاملة")
  await Promise.all([
    gatekeeper.page.waitForURL(/\/dashboard\/entries\/\d+$/, { timeout: 20000 }),
    gatekeeper.page.getByRole("button", { name: "تسجيل وإصدار QR" }).click(),
  ])
  const sellerEntryId = Number(new URL(gatekeeper.page.url()).pathname.split("/").pop())
  cleanup.entryIds.push(sellerEntryId)
  await gatekeeper.page.getByText("بطاقة دخول البضاعة").waitFor()
  await gatekeeper.page.getByRole("button", { name: "طباعة بطاقة البضاعة" }).waitFor()
  assert(await gatekeeper.page.locator("svg").count() > 0, "QR SVG was not rendered")
  await gatekeeper.page.evaluate(() => { window.print = () => { document.body.dataset.printCalled = "yes" } })
  await gatekeeper.page.getByRole("button", { name: "طباعة بطاقة البضاعة" }).click()
  assert(await gatekeeper.page.locator("body").getAttribute("data-print-called") === "yes", "QR print button did not invoke print")
  const { data: sellerEntry } = await service.from("market_entries").select("*").eq("id", sellerEntryId).single()
  assert(sellerEntry.qr_token && sellerEntry.receipt_number, "Seller QR token or entry receipt is missing")
  pass("تسجيل البائع وإصدار QR", "حُفظت السلعة وظهر الكود والبطاقة واستدعى زر الطباعة")
  await gatekeeper.context.close()

  const auctioneer = await login(browser, env.RSO_AUCTIONEER_EMAIL, env.RSO_AUCTIONEER_PASSWORD)
  assert(await auctioneer.page.getByText("المستخدمون والاعتمادات").count() === 0, "Auctioneer sees admin navigation")
  await auctioneer.page.goto(`${baseUrl}/dashboard/entries/new`, { waitUntil: "networkidle" })
  assert(new URL(auctioneer.page.url()).pathname === "/dashboard", "Auctioneer reached gatekeeper page")
  pass("صلاحيات الدلّال", "لا يرى أدوات المدير ولا يستطيع تسجيل دخولات السوق")

  await auctioneer.page.goto(`${baseUrl}/dashboard/settlements/new`, { waitUntil: "networkidle" })
  await auctioneer.page.locator('form[action="/dashboard/settlements/new"] input[name="token"]').fill("invalid-token")
  await auctioneer.page.getByRole("button", { name: "تحميل البضاعة" }).click()
  await auctioneer.page.getByText("الكود غير صالح، أو تم توثيق هذه البضاعة مسبقاً.").waitFor()
  pass("رفض QR غير صالح", "ظهرت رسالة واضحة ولم تُفتح بيانات صفقة")

  await auctioneer.page.goto(`${baseUrl}/dashboard/settlements/new`, { waitUntil: "networkidle" })
  await auctioneer.page.getByRole("button", { name: "فتح الكاميرا" }).click()
  await auctioneer.page.getByRole("button", { name: "إيقاف الكاميرا" }).waitFor()
  await auctioneer.page.locator("video").waitFor({ timeout: 15000 })
  await auctioneer.page.getByRole("button", { name: "إيقاف الكاميرا" }).click()
  pass("ماسح QR بالكاميرا", "طلب الكاميرا وبدأ بث المعاينة ويمكن إيقافه")

  await auctioneer.page.goto(`${baseUrl}/dashboard/settlements/new?token=${encodeURIComponent(sellerEntry.qr_token)}`, { waitUntil: "networkidle" })
  await auctioneer.page.getByText(`مزارع اختبار ${runId}`).waitFor()
  await auctioneer.page.locator("#approved_buyer_id").selectOption(String(buyer.id))
  assert(await auctioneer.page.locator("#buyer_name").inputValue() === buyerName, "Approved buyer name was not filled")
  assert(await auctioneer.page.locator("#buyer_phone").inputValue() === buyerPhone, "Approved buyer phone was not filled")
  await auctioneer.page.locator("#final_price").fill("20000")
  await auctioneer.page.locator("#notes").fill("ترسية بمشتري معتمد")
  await Promise.all([
    auctioneer.page.waitForURL(/\/dashboard\/receipts\/RSO-S-/, { timeout: 20000 }),
    auctioneer.page.getByRole("button", { name: "إصدار وتوثيق السند" }).click(),
  ])
  const approvedReceipt = decodeURIComponent(new URL(auctioneer.page.url()).pathname.split("/").pop())
  const { data: approvedSettlement } = await service.from("auction_settlements").select("*").eq("receipt_number", approvedReceipt).single()
  cleanup.settlementIds.push(approvedSettlement.id)
  cleanup.activityEntityIds.push(String(approvedSettlement.id))
  assert(Number(approvedSettlement.auctioneer_commission) === 500 && Number(approvedSettlement.platform_commission) === 150, "Dynamic commission calculation is wrong")
  await auctioneer.page.getByRole("heading", { name: "سند ترسية مزاد" }).waitFor()
  await auctioneer.page.evaluate(() => { window.print = () => { document.body.dataset.printCalled = "yes" } })
  await auctioneer.page.getByRole("button", { name: "طباعة السند" }).click()
  assert(await auctioneer.page.locator("body").getAttribute("data-print-called") === "yes", "Receipt print button did not invoke print")
  pass("الترسية بمشتري معتمد", "اختيار تلقائي واحتساب صحيح للعمولات وإصدار سند قابل للطباعة")

  const secondEntry = await createEntryForGatekeeper(gatekeeperProfile.id, "2")
  await auctioneer.page.goto(`${baseUrl}/dashboard/settlements/new?token=${encodeURIComponent(secondEntry.qr_token)}`, { waitUntil: "networkidle" })
  await auctioneer.page.locator("#buyer_name").fill(`مشتري جديد ${runId}`)
  await auctioneer.page.locator("#buyer_phone").fill(`054${runId}`)
  await auctioneer.page.locator("#final_price").fill("8000")
  await Promise.all([
    auctioneer.page.waitForURL(/\/dashboard\/receipts\/RSO-S-/, { timeout: 20000 }),
    auctioneer.page.getByRole("button", { name: "إصدار وتوثيق السند" }).click(),
  ])
  const newBuyerReceipt = decodeURIComponent(new URL(auctioneer.page.url()).pathname.split("/").pop())
  const { data: newBuyerSettlement } = await service.from("auction_settlements").select("*").eq("receipt_number", newBuyerReceipt).single()
  cleanup.settlementIds.push(newBuyerSettlement.id)
  cleanup.activityEntityIds.push(String(newBuyerSettlement.id))
  assert(newBuyerSettlement.approved_buyer_id === null && newBuyerSettlement.buyer_name === `مشتري جديد ${runId}`, "New buyer settlement failed")
  pass("الترسية لمشتري جديد", "حفظ بيانات المشتري الجديد وأصدر سندًا دون إضافته للدليل المعتمد")

  await auctioneer.page.goto(`${baseUrl}/dashboard/settlements/new?token=${encodeURIComponent(sellerEntry.qr_token)}`, { waitUntil: "networkidle" })
  await auctioneer.page.getByText("الكود غير صالح، أو تم توثيق هذه البضاعة مسبقاً.").waitFor()
  pass("منع بيع البضاعة مرتين", "رفض الكود بعد توثيق الترسية الأولى")

  await auctioneer.page.goto(`${baseUrl}/dashboard/receipts`, { waitUntil: "networkidle" })
  await auctioneer.page.getByText(approvedReceipt).waitFor()
  await auctioneer.page.getByText(newBuyerReceipt).waitFor()
  pass("سجل السندات للدلّال", "يعرض الصفقات التي نفذها ويمكن فتح السند")
  await auctioneer.context.close()

  const gatekeeperReceipt = await login(browser, env.RSO_GATEKEEPER_EMAIL, env.RSO_GATEKEEPER_PASSWORD)
  await gatekeeperReceipt.page.goto(`${baseUrl}/dashboard/receipts`, { waitUntil: "networkidle" })
  await gatekeeperReceipt.page.getByText(approvedReceipt).waitFor()
  pass("سجل السندات للبوّاب", "يعرض السند المرتبط بالبضاعة التي سجلها")
  await gatekeeperReceipt.page.getByRole("button", { name: "تسجيل الخروج" }).click()
  await gatekeeperReceipt.page.waitForURL((url) => url.pathname === "/auth/login")
  pass("تسجيل الخروج", "أنهى الجلسة وأعاد المستخدم لصفحة الدخول")
  await gatekeeperReceipt.context.close()

  const finalPublicContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const finalPublicPage = await finalPublicContext.newPage()
  await finalPublicPage.goto(`${baseUrl}/verify?q=${encodeURIComponent(approvedReceipt)}`, { waitUntil: "networkidle" })
  await finalPublicPage.getByText(approvedReceipt).waitFor()
  assert(await finalPublicPage.getByText("سعر الترسية").count() === 0, "Price visibility setting was ignored for new receipt")
  pass("تطبيق خصوصية السند على الصفقات الجديدة", "السند قابل للتحقق مع إخفاء السعر حسب قرار المدير")
  await finalPublicContext.close()

  const finalAdmin = await login(browser, env.RSO_ADMIN_EMAIL, env.RSO_ADMIN_PASSWORD)
  await finalAdmin.page.goto(`${baseUrl}/dashboard/admin/commissions`, { waitUntil: "networkidle" })
  await finalAdmin.page.getByText("ملخص التسويات").waitFor()
  const { data: dailySummary, error: dailySummaryError } = await service.from("daily_commission_summary").select("*").eq("auctioneer_id", auctioneerProfile.id).order("business_date", { ascending: false }).limit(1).single()
  if (dailySummaryError) throw dailySummaryError
  assert(Number(dailySummary.deals_count) >= 2 && Number(dailySummary.gross_sales) >= 28000, "Daily settlement summary did not include test deals")
  assert(await finalAdmin.page.locator("table tbody tr").count() >= 1, "Daily settlement summary table is empty")
  pass("التسويات اليومية", "تحدث الملخص اليومي بعد الصفقات ويعرض الإجماليات والعمولات")
  await finalAdmin.context.close()

  console.log(JSON.stringify({ ok: true, total: results.length, results }, null, 2))
} finally {
  await browser.close()

  if (originalSettings) {
    await service.from("site_settings").update({
      platform_name: originalSettings.platform_name,
      hero_title: originalSettings.hero_title,
      hero_description: originalSettings.hero_description,
      announcement: originalSettings.announcement,
      announcement_enabled: originalSettings.announcement_enabled,
      public_search_enabled: originalSettings.public_search_enabled,
      workflow_enabled: originalSettings.workflow_enabled,
      governance_enabled: originalSettings.governance_enabled,
      public_fields: originalSettings.public_fields,
      stats_enabled: originalSettings.stats_enabled,
      public_visitor_count_enabled: originalSettings.public_visitor_count_enabled,
      updated_by: originalSettings.updated_by,
    }).eq("id", true)
  }

  if (originalCommission && cleanup.commissionId) {
    await service.from("commission_settings").update({ is_active: false, effective_to: new Date().toISOString() }).eq("id", cleanup.commissionId)
    await service.from("commission_settings").update({ is_active: true, effective_to: null }).eq("id", originalCommission.id)
    await service.from("commission_settings").delete().eq("id", cleanup.commissionId)
  }

  if (cleanup.activityEntityIds.length) await service.from("activity_events").delete().in("entity_id", cleanup.activityEntityIds)
  if (cleanup.settlementIds.length) await service.from("auction_settlements").delete().in("id", cleanup.settlementIds)
  if (cleanup.entryIds.length) {
    await service.from("activity_events").delete().eq("entity_type", "market_entry").in("entity_id", cleanup.entryIds.map(String))
    await service.from("market_entries").delete().in("id", cleanup.entryIds)
  }
  if (cleanup.buyerIds.length) await service.from("approved_buyers").delete().in("id", cleanup.buyerIds)
  for (const userId of cleanup.userIds) await service.auth.admin.deleteUser(userId)
}
