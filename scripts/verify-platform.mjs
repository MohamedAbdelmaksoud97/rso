import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { randomBytes, randomUUID } from "node:crypto"

const envFile = readFileSync(".env.local", "utf8")
const env = Object.fromEntries(
  envFile
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=")
      return [line.slice(0, separator), line.slice(separator + 1)]
    }),
)

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RSO_ADMIN_EMAIL",
  "RSO_ADMIN_PASSWORD",
  "RSO_GATEKEEPER_EMAIL",
  "RSO_GATEKEEPER_PASSWORD",
  "RSO_AUCTIONEER_EMAIL",
  "RSO_AUCTIONEER_PASSWORD",
]

for (const key of required) {
  if (!env[key]) throw new Error(`Missing ${key}`)
}

const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function client() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function createTestPassword(label) {
  return `${label}-${randomBytes(18).toString("base64url")}!7aA`
}

async function signIn(email, password) {
  const supabase = client()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  assert(data.user, `No authenticated user returned for ${email}`)
  return { supabase, user: data.user, session: data.session }
}

async function ensureUser(email, password, fullName, phone) {
  const { data: listed, error: listError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) throw listError
  let user = listed.users.find((item) => item.email === email)
  if (!user) {
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    })
    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await service.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    })
    if (error) throw error
    user = data.user
  }
  return user
}

const checks = []
const temporaryUsers = []
let originalPublicFields
let realtimeProbe

try {
  const adminSession = await signIn(env.RSO_ADMIN_EMAIL, env.RSO_ADMIN_PASSWORD)
  checks.push("admin-login")

  const gatekeeperUser = await ensureUser(
    env.RSO_GATEKEEPER_EMAIL,
    env.RSO_GATEKEEPER_PASSWORD,
    "بوّاب السوق",
    "0500000011",
  )
  const auctioneerUser = await ensureUser(
    env.RSO_AUCTIONEER_EMAIL,
    env.RSO_AUCTIONEER_PASSWORD,
    "دلّال السوق",
    "0500000022",
  )

  for (const [user, role] of [[gatekeeperUser, "gatekeeper"], [auctioneerUser, "auctioneer"]]) {
    const { data, error } = await adminSession.supabase
      .from("profiles")
      .update({
        role,
        approval_status: "approved",
        approved_by: adminSession.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id,role,approval_status")
      .single()
    if (error) throw error
    assert(data.role === role && data.approval_status === "approved", `Could not approve ${role}`)
  }
  checks.push("admin-role-approval")

  const gatekeeper = await signIn(env.RSO_GATEKEEPER_EMAIL, env.RSO_GATEKEEPER_PASSWORD)
  const auctioneer = await signIn(env.RSO_AUCTIONEER_EMAIL, env.RSO_AUCTIONEER_PASSWORD)
  checks.push("staff-login")

  const { error: commissionError } = await adminSession.supabase.rpc("set_commission_rates", {
    p_auctioneer_rate_percent: 2,
    p_platform_rate_percent: 0.5,
  })
  if (commissionError) throw commissionError
  checks.push("dynamic-commissions")

  const { error: forbiddenCommission } = await gatekeeper.supabase.rpc("set_commission_rates", {
    p_auctioneer_rate_percent: 3,
    p_platform_rate_percent: 1,
  })
  assert(forbiddenCommission, "Gatekeeper unexpectedly changed commission settings")
  checks.push("commission-rls")

  let { data: buyer, error: buyerReadError } = await adminSession.supabase
    .from("approved_buyers")
    .select("id,full_name,phone")
    .eq("phone", "0555555555")
    .maybeSingle()
  if (buyerReadError) throw buyerReadError
  if (!buyer) {
    const result = await adminSession.supabase
      .from("approved_buyers")
      .insert({
        full_name: "مؤسسة واحات الخير",
        phone: "0555555555",
        national_id: "7000000001",
        created_by: adminSession.user.id,
      })
      .select("id,full_name,phone")
      .single()
    if (result.error) throw result.error
    buyer = result.data
  }
  checks.push("approved-buyers")

  let { data: entry, error: entryReadError } = await gatekeeper.supabase
    .from("market_entries")
    .select("*")
    .eq("mobile_or_id", "0500000100")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (entryReadError) throw entryReadError
  if (!entry) {
    const result = await gatekeeper.supabase
      .from("market_entries")
      .insert({
        entry_kind: "seller",
        person_name: "مزرعة نخيل القصيم",
        mobile_or_id: "0500000100",
        commodity_type: "خلاص",
        quantity: 120,
        unit_label: "صندوق",
        total_weight_kg: 960,
        notes: "سجل تشغيلي موثق",
        gatekeeper_id: gatekeeper.user.id,
      })
      .select("*")
      .single()
    if (result.error) throw result.error
    entry = result.data
  }
  assert(entry.qr_token && entry.receipt_number, "Entry QR data was not generated")
  checks.push("gatekeeper-entry-and-qr")

  let { data: settlement, error: settlementReadError } = await auctioneer.supabase
    .from("auction_settlements")
    .select("*")
    .eq("market_entry_id", entry.id)
    .maybeSingle()
  if (settlementReadError) throw settlementReadError
  if (!settlement) {
    const result = await auctioneer.supabase.rpc("create_auction_settlement", {
      p_qr_token: entry.qr_token,
      p_approved_buyer_id: buyer.id,
      p_buyer_name: buyer.full_name,
      p_buyer_phone: buyer.phone,
      p_final_price: 12500,
      p_notes: "صفقة تحقق تشغيلية",
    })
    if (result.error) throw result.error
    settlement = Array.isArray(result.data) ? result.data[0] : result.data
  }
  assert(settlement.receipt_number, "Settlement receipt number was not generated")
  assert(Number(settlement.auctioneer_commission) === 250, "Auctioneer commission calculation is incorrect")
  assert(Number(settlement.platform_commission) === 62.5, "Platform commission calculation is incorrect")
  checks.push("auction-settlement-and-receipt")

  const { error: forbiddenSettlement } = await gatekeeper.supabase.rpc("create_auction_settlement", {
    p_qr_token: randomUUID(),
    p_approved_buyer_id: null,
    p_buyer_name: "مشتري اختبار",
    p_buyer_phone: "0500000199",
    p_final_price: 100,
    p_notes: null,
  })
  assert(forbiddenSettlement, "Gatekeeper unexpectedly created a settlement")
  checks.push("settlement-role-guard")

  const anonymous = client()
  const { data: publicByReceipt, error: publicReceiptError } = await anonymous.rpc("search_public_receipt", {
    p_query: settlement.receipt_number,
  })
  if (publicReceiptError) throw publicReceiptError
  assert(publicByReceipt?.length === 1, "Public receipt search did not find the settlement")

  const { data: publicByMobile, error: publicMobileError } = await anonymous.rpc("search_public_receipt", {
    p_query: entry.mobile_or_id,
  })
  if (publicMobileError) throw publicMobileError
  assert(publicByMobile?.some((item) => item.receipt_number === settlement.receipt_number), "Public mobile search failed")

  const { data: anonymousRows, error: anonymousDirectRead } = await anonymous.from("auction_settlements").select("id").limit(1)
  assert(anonymousDirectRead || anonymousRows?.length === 0, "Anonymous user unexpectedly read settlement rows directly")
  checks.push("public-search-and-private-tables")

  const { data: settings, error: settingsError } = await adminSession.supabase
    .from("site_settings")
    .select("public_fields")
    .eq("id", true)
    .single()
  if (settingsError) throw settingsError
  originalPublicFields = settings.public_fields
  const hiddenPriceFields = { ...originalPublicFields, final_price: false }
  const { error: hideError } = await adminSession.supabase
    .from("site_settings")
    .update({ public_fields: hiddenPriceFields, updated_by: adminSession.user.id })
    .eq("id", true)
  if (hideError) throw hideError
  const { data: hiddenPriceResult, error: hiddenPriceError } = await anonymous.rpc("search_public_receipt", {
    p_query: settlement.receipt_number,
  })
  if (hiddenPriceError) throw hiddenPriceError
  assert(hiddenPriceResult?.[0]?.final_price === null, "Public field visibility did not hide final price")
  const { error: restoreError } = await adminSession.supabase
    .from("site_settings")
    .update({ public_fields: originalPublicFields, updated_by: adminSession.user.id })
    .eq("id", true)
  if (restoreError) throw restoreError
  originalPublicFields = undefined
  checks.push("dynamic-public-visibility")

  const pendingEmail = `pending-${Date.now()}@example.com`
  const pendingPassword = createTestPassword("Pending")
  const { data: pendingCreated, error: pendingCreateError } = await service.auth.admin.createUser({
    email: pendingEmail,
    password: pendingPassword,
    email_confirm: true,
    user_metadata: { full_name: "موظف قيد المراجعة", phone: "0500000188" },
  })
  if (pendingCreateError) throw pendingCreateError
  temporaryUsers.push(pendingCreated.user.id)
  const pending = await signIn(pendingEmail, pendingPassword)
  const { data: pendingRows, error: pendingRowsError } = await pending.supabase.from("market_entries").select("id")
  if (pendingRowsError) throw pendingRowsError
  assert(pendingRows.length === 0, "Pending user unexpectedly read market entries")
  checks.push("pending-user-isolation")

  const unconfirmedEmail = `unconfirmed-${Date.now()}@example.com`
  const unconfirmedPassword = createTestPassword("Unconfirmed")
  const { data: unconfirmedCreated, error: unconfirmedCreateError } = await service.auth.admin.createUser({
    email: unconfirmedEmail,
    password: unconfirmedPassword,
    email_confirm: false,
    user_metadata: { full_name: "موظف غير مؤكد", phone: "0500000177" },
  })
  if (unconfirmedCreateError) throw unconfirmedCreateError
  temporaryUsers.push(unconfirmedCreated.user.id)
  const { error: prematureApprovalError } = await adminSession.supabase
    .from("profiles")
    .update({ role: "gatekeeper", approval_status: "approved" })
    .eq("id", unconfirmedCreated.user.id)
  assert(prematureApprovalError, "Unconfirmed account was unexpectedly approved")
  checks.push("email-confirmation-guard")

  const probe = randomUUID()
  realtimeProbe = probe
  let resolveRealtime
  let rejectRealtime
  const realtimeReceived = new Promise((resolve, reject) => {
    resolveRealtime = resolve
    rejectRealtime = reject
  })
  const realtimeStatuses = []
  await adminSession.supabase.realtime.setAuth(adminSession.session.access_token)
  const timer = setTimeout(() => rejectRealtime(new Error(`Realtime event was not received. Statuses: ${realtimeStatuses.join(", ")}`)), 30000)
  const channel = adminSession.supabase
    .channel(`verification-${probe}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, (payload) => {
      if (payload.new?.entity_id === probe) resolveRealtime(payload)
    })
    .subscribe(async (status, statusError) => {
      realtimeStatuses.push(statusError ? `${status}:${statusError.message}` : status)
      if (status !== "SUBSCRIBED") return
      await new Promise((resolve) => setTimeout(resolve, 750))
      const { error } = await gatekeeper.supabase
        .from("activity_events")
        .insert({
          event_type: "verification_probe",
          actor_id: gatekeeper.user.id,
          entity_type: "system_check",
          entity_id: probe,
          summary: "اختبار الاتصال اللحظي",
        })
      if (error) rejectRealtime(error)
    })
  await realtimeReceived
  clearTimeout(timer)
  await adminSession.supabase.removeChannel(channel)
  checks.push("realtime-supervisor")

  const { data: publicStats, error: publicStatsError } = await anonymous.rpc("get_public_market_stats")
  if (publicStatsError) throw publicStatsError
  const { data: publicStatsSettings, error: publicStatsSettingsError } = await service
    .from("site_settings")
    .select("stats_enabled")
    .eq("id", true)
    .single()
  if (publicStatsSettingsError) throw publicStatsSettingsError
  const publicReceiptCount = Number(publicStats?.[0]?.verified_receipts ?? 0)
  assert(
    publicStatsSettings.stats_enabled ? publicReceiptCount >= 1 : publicReceiptCount === 0,
    "Public market statistics do not match the manager visibility setting",
  )
  checks.push("live-public-stats")

  console.log(JSON.stringify({
    ok: true,
    checks,
    receiptNumber: settlement.receipt_number,
    entryReceiptNumber: entry.receipt_number,
    publicSearchValue: entry.mobile_or_id,
  }, null, 2))
} finally {
  if (originalPublicFields) {
    const adminSession = await signIn(env.RSO_ADMIN_EMAIL, env.RSO_ADMIN_PASSWORD)
    await adminSession.supabase.from("site_settings").update({ public_fields: originalPublicFields }).eq("id", true)
  }
  if (realtimeProbe) await service.from("activity_events").delete().eq("entity_id", realtimeProbe)
  for (const userId of temporaryUsers) await service.auth.admin.deleteUser(userId)
}

process.exit(0)
