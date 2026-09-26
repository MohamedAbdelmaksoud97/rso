import { createClient } from "@/lib/server"
import { defaultSiteSettings } from "@/lib/constants"
import type { DailyAttendance, MarketEntry, Profile, Settlement, SiteSettings } from "@/lib/types"

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = await createClient()
  const { data } = await supabase.from("site_settings").select("platform_name,hero_title,hero_description,announcement,announcement_enabled,public_search_enabled,workflow_enabled,governance_enabled,public_fields,stats_enabled,public_visitor_count_enabled,updated_at").eq("id", true).maybeSingle()
  return (data as SiteSettings | null) ?? defaultSiteSettings
}

export async function getPublicMarketStats() {
  const supabase = await createClient()
  const { data } = await supabase.rpc("get_public_market_stats")
  const stats = Array.isArray(data) ? data[0] : data
  return {
    entriesToday: Number(stats?.entries_today ?? 0),
    visitorsToday: Number(stats?.visitors_today ?? 0),
    settlementsToday: Number(stats?.settlements_today ?? 0),
    verifiedReceipts: Number(stats?.verified_receipts ?? 0),
  }
}

export async function getDailyAttendance(days = 30): Promise<DailyAttendance[]> {
  const supabase = await createClient()
  const start = new Date()
  start.setUTCDate(start.getUTCDate() - Math.max(1, days - 1))
  const startDate = start.toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from("daily_attendance_summary")
    .select("business_date,visitors_count,sellers_count,total_entries")
    .gte("business_date", startDate)
    .order("business_date", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    business_date: String(row.business_date),
    visitors_count: Number(row.visitors_count),
    sellers_count: Number(row.sellers_count),
    total_entries: Number(row.total_entries),
  }))
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return null
  const { data } = await supabase.from("profiles").select("id,full_name,email,phone,email_confirmed,role,approval_status,created_at").eq("id", userId).maybeSingle()
  return data as Profile | null
}

export async function getDashboardData(profile: Profile) {
  const supabase = await createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const entryQuery = supabase.from("market_entries").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(6)
  const settlementQuery = supabase.from("auction_settlements").select("id,receipt_number,buyer_name,buyer_phone,final_price,auctioneer_commission,platform_commission,settled_at,market_entries(person_name,commodity_type,quantity,unit_label,total_weight_kg)", { count: "exact" }).gte("settled_at", today.toISOString()).order("settled_at", { ascending: false }).limit(6)
  const pendingQuery = profile.role === "admin"
    ? supabase.from("profiles").select("id", { count: "exact", head: true }).eq("approval_status", "pending")
    : Promise.resolve({ count: 0 })

  const [entries, settlements, pending] = await Promise.all([entryQuery, settlementQuery, pendingQuery])
  const todaySettlements = (settlements.data ?? []) as unknown as Settlement[]

  return {
    entries: (entries.data ?? []) as MarketEntry[],
    settlements: todaySettlements,
    entryCount: entries.count ?? 0,
    settlementCount: settlements.count ?? 0,
    salesTotal: todaySettlements.reduce((sum, item) => sum + Number(item.final_price), 0),
    commissionTotal: todaySettlements.reduce((sum, item) => sum + Number(item.platform_commission), 0),
    pendingUsers: pending.count ?? 0,
  }
}
