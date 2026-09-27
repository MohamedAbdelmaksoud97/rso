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

const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const baseUrl = process.env.RSO_TEST_BASE_URL ?? "http://localhost:3000"
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
})
const checks = []
const temporaryUsers = []

function createTestPassword(label) {
  return `${label}-${randomBytes(18).toString("base64url")}!7aA`
}

function publicClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function findUser(email) {
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return data.users.find((user) => user.email === email)
}

async function verifyPassword(email, password) {
  const supabase = publicClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (!data.user) throw new Error(`Password verification failed for ${email}`)
  await supabase.auth.signOut()
}

async function loginPage(email, password) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
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

try {
  const registrationContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const registrationPage = await registrationContext.newPage()
  const registrationEmail = `request-${Date.now()}@rsu.sa`
  const registrationPassword = createTestPassword("Register")
  await registrationPage.goto(`${baseUrl}/auth/register`, { waitUntil: "networkidle" })
  for (const field of ["#full_name", "#phone", "#email", "#password"]) {
    if (await registrationPage.locator(field).count() !== 1) throw new Error(`Registration field ${field} is missing`)
  }
  await registrationPage.getByRole("button", { name: "إنشاء الطلب" }).waitFor()

  // Generate a confirmation link without sending an email. This exercises the same
  // callback and approval workflow without consuming the project's SMTP quota.
  const { data: generatedSignup, error: generatedSignupError } = await service.auth.admin.generateLink({
    type: "signup",
    email: registrationEmail,
    password: registrationPassword,
    options: {
      data: { full_name: "موظف اختبار التسجيل", phone: "0500000166" },
      redirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
    },
  })
  if (generatedSignupError) throw generatedSignupError
  const registeredUser = generatedSignup.user
  const confirmationToken = generatedSignup.properties.hashed_token
  temporaryUsers.push(registeredUser.id)
  await registrationPage.goto(
    `${baseUrl}/auth/callback?token_hash=${encodeURIComponent(confirmationToken)}&type=signup&next=/dashboard`,
    { waitUntil: "networkidle" },
  )
  if (new URL(registrationPage.url()).pathname !== "/dashboard") {
    throw new Error(`Confirmation link ended at ${new URL(registrationPage.url()).pathname}${new URL(registrationPage.url()).search}`)
  }
  await registrationPage.getByText("طلبك بانتظار اعتماد المدير").waitFor()
  const { data: registeredProfile, error: registeredProfileError } = await service
    .from("profiles")
    .select("approval_status,email_confirmed,role")
    .eq("id", registeredUser.id)
    .single()
  if (registeredProfileError) throw registeredProfileError
  if (registeredProfile.approval_status !== "pending" || !registeredProfile.email_confirmed || registeredProfile.role !== null) {
    throw new Error("New account did not enter the pending approval state")
  }
  checks.push("registration-form")
  checks.push("generated-confirmation-link-and-pending-approval")
  await registrationPage.goto(`${baseUrl}/auth/callback`, { waitUntil: "networkidle" })
  await registrationPage.waitForURL((url) => url.pathname === "/dashboard", { timeout: 20_000 })
  await registrationPage.getByText("طلبك بانتظار اعتماد المدير").waitFor()
  checks.push("confirmed-session-survives-repeated-callback")
  await registrationContext.close()

  const recoveryContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const recoveryPage = await recoveryContext.newPage()
  await recoveryPage.goto(`${baseUrl}/auth/forgot-password`, { waitUntil: "networkidle" })
  await recoveryPage.locator("#email").waitFor()
  await recoveryPage.getByRole("button", { name: "إرسال رابط الاستعادة" }).waitFor()
  checks.push("forgot-password-form")

  const auctioneer = await loginPage(env.RSO_AUCTIONEER_EMAIL, env.RSO_AUCTIONEER_PASSWORD)
  const changedAuctioneerPassword = createTestPassword("Change")
  await auctioneer.page.goto(`${baseUrl}/dashboard/account`, { waitUntil: "networkidle" })
  await auctioneer.page.locator("#password").fill(changedAuctioneerPassword)
  await auctioneer.page.locator("#confirm_password").fill(changedAuctioneerPassword)
  await Promise.all([
    auctioneer.page.waitForURL((url) => url.pathname === "/auth/login", { timeout: 20000 }),
    auctioneer.page.getByRole("button", { name: "تغيير كلمة المرور" }).click(),
  ])
  await verifyPassword(env.RSO_AUCTIONEER_EMAIL, changedAuctioneerPassword)
  checks.push("authenticated-password-change")
  await auctioneer.context.close()
  const auctioneerUser = await findUser(env.RSO_AUCTIONEER_EMAIL)
  if (!auctioneerUser) throw new Error("Auctioneer account disappeared")
  const { error: restoreAuctioneerError } = await service.auth.admin.updateUserById(auctioneerUser.id, {
    password: env.RSO_AUCTIONEER_PASSWORD,
  })
  if (restoreAuctioneerError) throw restoreAuctioneerError

  const updatedGatekeeperPassword = createTestPassword("Recover")
  const { data: recoveryLink, error: recoveryLinkError } = await service.auth.admin.generateLink({
    type: "recovery",
    email: env.RSO_GATEKEEPER_EMAIL,
    options: { redirectTo: `${baseUrl}/auth/callback?next=/auth/update-password` },
  })
  if (recoveryLinkError) throw recoveryLinkError
  await recoveryPage.goto(
    `${baseUrl}/auth/callback?token_hash=${encodeURIComponent(recoveryLink.properties.hashed_token)}&type=recovery&next=/auth/update-password`,
    { waitUntil: "networkidle" },
  )
  await recoveryPage.waitForURL((url) => url.pathname === "/auth/update-password", { timeout: 20000 })
  await recoveryPage.locator("#password").fill(updatedGatekeeperPassword)
  await recoveryPage.locator("#confirm_password").fill(updatedGatekeeperPassword)
  await Promise.all([
    recoveryPage.waitForURL((url) => url.pathname === "/auth/login", { timeout: 20000 }),
    recoveryPage.getByRole("button", { name: "حفظ كلمة المرور" }).click(),
  ])
  await verifyPassword(env.RSO_GATEKEEPER_EMAIL, updatedGatekeeperPassword)
  checks.push("generated-recovery-link-and-password-update")
  checks.push("no-outbound-test-email")
  await recoveryContext.close()
  const gatekeeperUser = await findUser(env.RSO_GATEKEEPER_EMAIL)
  if (!gatekeeperUser) throw new Error("Gatekeeper account disappeared")
  const { error: restoreGatekeeperError } = await service.auth.admin.updateUserById(gatekeeperUser.id, {
    password: env.RSO_GATEKEEPER_PASSWORD,
  })
  if (restoreGatekeeperError) throw restoreGatekeeperError

  console.log(JSON.stringify({ ok: true, checks }, null, 2))
} finally {
  const auctioneerUser = await findUser(env.RSO_AUCTIONEER_EMAIL)
  if (auctioneerUser) await service.auth.admin.updateUserById(auctioneerUser.id, { password: env.RSO_AUCTIONEER_PASSWORD })
  const gatekeeperUser = await findUser(env.RSO_GATEKEEPER_EMAIL)
  if (gatekeeperUser) await service.auth.admin.updateUserById(gatekeeperUser.id, { password: env.RSO_GATEKEEPER_PASSWORD })
  for (const userId of temporaryUsers) await service.auth.admin.deleteUser(userId)
  await browser.close()
}
