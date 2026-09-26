"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"
import type { AppRole, Profile } from "@/lib/types"

type PlatformOperation = "entry" | "settlement" | "approval" | "buyer" | "commission" | "settings"

function platformErrorMessage(operation: PlatformOperation, technicalMessage = "") {
  const message = technicalMessage.toLowerCase()
  if (operation === "settlement" && technicalMessage.includes("الكود غير صالح")) return "تعذر توثيق الصفقة لأن بطاقة البضاعة غير صالحة أو سبق استخدامها."
  if (operation === "settlement" && technicalMessage.includes("إعداد العمولات")) return "لا يمكن توثيق الصفقة قبل تحديد نسب العمولات. راجع مدير المنصة."
  if (operation === "buyer" && (message.includes("duplicate") || message.includes("unique"))) return "رقم الجوال أو الهوية مسجل مسبقًا لمشترٍ آخر. راجع البيانات ثم حاول مرة أخرى."
  if (operation === "commission" && technicalMessage.includes("بين 0 و100")) return "أدخل نسبة صحيحة من 0 إلى 100 لكل عمولة."

  return {
    entry: "تعذر تسجيل الدخول الآن، ولم يتم حفظ البيانات. حاول مرة أخرى.",
    settlement: "تعذر إصدار السند الآن، ولم تُحفظ الصفقة. راجع البيانات ثم حاول مرة أخرى.",
    approval: "تعذر حفظ حالة الموظف الآن. حاول مرة أخرى.",
    buyer: "تعذر إضافة المشتري الآن. راجع البيانات ثم حاول مرة أخرى.",
    commission: "تعذر تفعيل نسب العمولات الآن. حاول مرة أخرى.",
    settings: "تعذر نشر الإعدادات الآن. لم تتغير الصفحة العامة، ويمكنك المحاولة مرة أخرى.",
  }[operation]
}

async function requireProfile(roles: AppRole[]) {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) redirect("/auth/login")
  const { data } = await supabase.from("profiles").select("id,role,approval_status").eq("id", userId).single()
  const profile = data as Pick<Profile, "id" | "role" | "approval_status"> | null
  if (!profile || profile.approval_status !== "approved" || !profile.role || !roles.includes(profile.role)) throw new Error("غير مصرح بتنفيذ هذا الإجراء")
  return { supabase, profile }
}

export async function createMarketEntry(formData: FormData) {
  const { supabase, profile } = await requireProfile(["gatekeeper", "admin"])
  const entryKindValue = String(formData.get("entry_kind"))
  if (entryKindValue !== "seller" && entryKindValue !== "visitor") redirect(`/dashboard/entries/new?error=${encodeURIComponent("نوع الدخول غير صالح.")}`)
  const entryKind = entryKindValue as "seller" | "visitor"
  const personName = String(formData.get("person_name") ?? "").trim()
  const mobileOrId = String(formData.get("mobile_or_id") ?? "").trim()
  const quantity = formData.get("quantity") ? Number(formData.get("quantity")) : null
  const weight = formData.get("total_weight_kg") ? Number(formData.get("total_weight_kg")) : null
  const commodityType = String(formData.get("commodity_type") ?? "").trim()
  if (entryKind === "seller" && (!personName || !mobileOrId || !commodityType || !quantity || !weight)) redirect(`/dashboard/entries/new?error=${encodeURIComponent("أكمل بيانات المورد والبضاعة المطلوبة.")}`)
  if (entryKind === "seller" && (quantity === null || !Number.isFinite(quantity) || quantity <= 0 || weight === null || !Number.isFinite(weight) || weight <= 0)) redirect(`/dashboard/entries/new?error=${encodeURIComponent("أدخل كمية ووزنًا أكبر من صفر.")}`)
  if (personName && personName.length < 2) redirect(`/dashboard/entries/new?error=${encodeURIComponent("يجب أن يتكون الاسم من حرفين على الأقل.")}`)
  if (mobileOrId && mobileOrId.length < 6) redirect(`/dashboard/entries/new?error=${encodeURIComponent("يجب أن يتكون رقم الجوال أو الهوية من 6 خانات على الأقل.")}`)
  const { data, error } = await supabase.from("market_entries").insert({
    entry_kind: entryKind,
    person_name: personName || null,
    mobile_or_id: mobileOrId || null,
    commodity_type: entryKind === "seller" ? commodityType : null,
    quantity: entryKind === "seller" ? quantity : null,
    unit_label: String(formData.get("unit_label") ?? "وحدة"),
    total_weight_kg: entryKind === "seller" ? weight : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    gatekeeper_id: profile.id,
  }).select("id").single()
  if (error) redirect(`/dashboard/entries/new?error=${encodeURIComponent(platformErrorMessage("entry", error.message))}`)
  redirect(`/dashboard/entries/${data.id}`)
}

export async function createSettlement(formData: FormData) {
  const { supabase } = await requireProfile(["auctioneer", "admin"])
  const buyerId = String(formData.get("approved_buyer_id") ?? "")
  const buyerName = String(formData.get("buyer_name") ?? "").trim()
  const finalPrice = Number(formData.get("final_price"))
  const qrToken = String(formData.get("qr_token") ?? "")
  if (buyerName.length < 2) redirect(`/dashboard/settlements/new?token=${encodeURIComponent(qrToken)}&error=${encodeURIComponent("أدخل اسم المشتري بشكل صحيح.")}`)
  if (!Number.isFinite(finalPrice) || finalPrice <= 0) redirect(`/dashboard/settlements/new?token=${encodeURIComponent(qrToken)}&error=${encodeURIComponent("أدخل سعر ترسية صحيحًا أكبر من صفر.")}`)
  const { data, error } = await supabase.rpc("create_auction_settlement", {
    p_qr_token: qrToken,
    p_approved_buyer_id: buyerId ? Number(buyerId) : null,
    p_buyer_name: buyerName,
    p_buyer_phone: String(formData.get("buyer_phone") ?? "").trim(),
    p_final_price: finalPrice,
    p_notes: String(formData.get("notes") ?? "").trim() || null,
  })
  if (error) redirect(`/dashboard/settlements/new?token=${encodeURIComponent(qrToken)}&error=${encodeURIComponent(platformErrorMessage("settlement", error.message))}`)
  const settlement = Array.isArray(data) ? data[0] : data
  redirect(`/dashboard/receipts/${settlement.receipt_number}`)
}

export async function updateUserApproval(formData: FormData) {
  const { supabase, profile } = await requireProfile(["admin"])
  const userId = String(formData.get("user_id"))
  const status = String(formData.get("approval_status"))
  const roleValue = String(formData.get("role"))
  if (!(["admin", "auctioneer", "gatekeeper"] as string[]).includes(roleValue) || !(["pending", "approved", "rejected", "suspended"] as string[]).includes(status)) redirect(`/dashboard/admin/users?error=${encodeURIComponent("اختر دورًا وحالة صالحين للموظف.")}`)
  const role = roleValue as AppRole
  const { data: target, error: targetError } = await supabase.from("profiles").select("email_confirmed").eq("id", userId).single()
  if (targetError) redirect(`/dashboard/admin/users?error=${encodeURIComponent(platformErrorMessage("approval"))}`)
  if (status === "approved" && !target?.email_confirmed) redirect(`/dashboard/admin/users?error=${encodeURIComponent("لا يمكن اعتماد الحساب قبل تأكيد البريد الإلكتروني.")}`)
  const { error } = await supabase.from("profiles").update({ role, approval_status: status, approved_by: profile.id, approved_at: status === "approved" ? new Date().toISOString() : null }).eq("id", userId)
  if (error) redirect(`/dashboard/admin/users?error=${encodeURIComponent(platformErrorMessage("approval", error.message))}`)
  revalidatePath("/dashboard/admin/users")
}

export async function createApprovedBuyer(formData: FormData) {
  const { supabase, profile } = await requireProfile(["admin"])
  const fullName = String(formData.get("full_name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const nationalId = String(formData.get("national_id") ?? "").trim()
  if (fullName.length < 2) redirect(`/dashboard/admin/buyers?error=${encodeURIComponent("أدخل اسم المشتري من حرفين على الأقل.")}`)
  if (phone && !/^[0-9+ ]{8,20}$/.test(phone)) redirect(`/dashboard/admin/buyers?error=${encodeURIComponent("أدخل رقم جوال صحيحًا من 8 إلى 20 خانة.")}`)
  const { error } = await supabase.from("approved_buyers").insert({ full_name: fullName, phone: phone || null, national_id: nationalId || null, is_active: true, created_by: profile.id })
  if (error) redirect(`/dashboard/admin/buyers?error=${encodeURIComponent(platformErrorMessage("buyer", error.message))}`)
  revalidatePath("/dashboard/admin/buyers")
}

export async function updateCommissionSettings(formData: FormData) {
  const { supabase } = await requireProfile(["admin"])
  const auctioneerRate = Number(formData.get("auctioneer_rate_percent"))
  const platformRate = Number(formData.get("platform_rate_percent"))
  if (![auctioneerRate, platformRate].every((rate) => Number.isFinite(rate) && rate >= 0 && rate <= 100)) redirect(`/dashboard/admin/commissions?error=${encodeURIComponent("أدخل نسبة صحيحة من 0 إلى 100 لكل عمولة.")}`)
  const { error } = await supabase.rpc("set_commission_rates", { p_auctioneer_rate_percent: auctioneerRate, p_platform_rate_percent: platformRate })
  if (error) redirect(`/dashboard/admin/commissions?error=${encodeURIComponent(platformErrorMessage("commission", error.message))}`)
  revalidatePath("/dashboard/admin/commissions")
}

export async function updateSiteSettings(formData: FormData) {
  const { supabase, profile } = await requireProfile(["admin"])
  const platformName = String(formData.get("platform_name") ?? "").trim()
  const heroTitle = String(formData.get("hero_title") ?? "").trim()
  const heroDescription = String(formData.get("hero_description") ?? "").trim()
  if (!platformName || !heroTitle || !heroDescription) redirect(`/dashboard/admin/settings?error=${encodeURIComponent("أكمل اسم المنصة والعنوان والوصف قبل النشر.")}`)
  const publicFields = ["seller_name", "commodity_type", "quantity", "total_weight_kg", "final_price", "buyer_name", "settled_at"].reduce<Record<string, boolean>>((fields, key) => { fields[key] = formData.get(key) === "on"; return fields }, {})
  const { data, error } = await supabase.from("site_settings").update({
    platform_name: platformName,
    hero_title: heroTitle,
    hero_description: heroDescription,
    announcement: String(formData.get("announcement") ?? "").trim() || null,
    announcement_enabled: formData.get("announcement_enabled") === "on",
    public_search_enabled: formData.get("public_search_enabled") === "on",
    workflow_enabled: formData.get("workflow_enabled") === "on",
    governance_enabled: formData.get("governance_enabled") === "on",
    stats_enabled: formData.get("stats_enabled") === "on",
    public_visitor_count_enabled: formData.get("public_visitor_count_enabled") === "on",
    public_fields: publicFields,
    updated_by: profile.id,
  }).eq("id", true).select("id").single()
  if (error || !data) redirect(`/dashboard/admin/settings?error=${encodeURIComponent(platformErrorMessage("settings", error?.message ?? ""))}`)
  revalidatePath("/")
  revalidatePath("/verify")
  revalidatePath("/dashboard/admin/settings")
  redirect(`/dashboard/admin/settings?success=${encodeURIComponent("تم حفظ الإعدادات ونشرها على الصفحة العامة.")}`)
}
