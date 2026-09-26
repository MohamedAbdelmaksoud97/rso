import { createClient } from "@/lib/server"
import { defaultSiteSettings } from "@/lib/constants"
import type { ContentPost, DailyAttendance, MarketEntry, Profile, Settlement, SiteSettings } from "@/lib/types"

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = await createClient()
  const { data } = await supabase.from("site_settings").select("platform_name,hero_title,hero_description,announcement,announcement_enabled,public_search_enabled,workflow_enabled,governance_enabled,news_enabled,public_fields,stats_enabled,public_visitor_count_enabled,updated_at").eq("id", true).maybeSingle()
  return (data as SiteSettings | null) ?? defaultSiteSettings
}

export async function getPublicContentPosts(limit = 6): Promise<ContentPost[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data } = await supabase
    .from("content_posts")
    .select("id,kind,title,summary,body,is_published,is_featured,publish_at,expires_at,created_at,updated_at")
    .eq("is_published", true)
    .lte("publish_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("is_featured", { ascending: false })
    .order("publish_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as ContentPost[]
}

export async function getPublicContentPost(id: number): Promise<ContentPost | null> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data } = await supabase
    .from("content_posts")
    .select("id,kind,title,summary,body,is_published,is_featured,publish_at,expires_at,created_at,updated_at")
    .eq("id", id)
    .eq("is_published", true)
    .lte("publish_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle()
  return data as ContentPost | null
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
  const businessDate = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Riyadh",
  }).format(new Date())
  const startOfBusinessDay = new Date(`${businessDate}T00:00:00+03:00`)
  const endOfBusinessDay = new Date(startOfBusinessDay)
  endOfBusinessDay.setUTCDate(endOfBusinessDay.getUTCDate() + 1)

  const entryQuery = supabase
    .from("market_entries")
    .select("*", { count: "exact" })
    .eq("entry_kind", "seller")
    .gte("created_at", startOfBusinessDay.toISOString())
    .lt("created_at", endOfBusinessDay.toISOString())
    .order("created_at", { ascending: false })
    .limit(6)
  const settlementQuery = supabase.from("auction_settlements").select("id,receipt_number,buyer_name,buyer_phone,final_price,auctioneer_commission,platform_commission,settled_at,market_entries(person_name,commodity_type,quantity,unit_label,total_weight_kg)", { count: "exact" }).gte("settled_at", startOfBusinessDay.toISOString()).lt("settled_at", endOfBusinessDay.toISOString()).order("settled_at", { ascending: false }).limit(6)
  const settlementTotalsQuery = supabase.from("daily_commission_summary").select("gross_sales,auctioneer_commission,platform_commission").eq("business_date", businessDate)
  const visitorQuery = profile.role === "admin"
    ? supabase
        .from("market_entries")
        .select("id", { count: "exact", head: true })
        .eq("entry_kind", "visitor")
        .gte("created_at", startOfBusinessDay.toISOString())
        .lt("created_at", endOfBusinessDay.toISOString())
    : Promise.resolve({ count: 0 })
  const pendingQuery = profile.role === "admin"
    ? supabase.from("profiles").select("id", { count: "exact", head: true }).eq("approval_status", "pending")
    : Promise.resolve({ count: 0 })

  const [entries, settlements, settlementTotals, visitors, pending] = await Promise.all([entryQuery, settlementQuery, settlementTotalsQuery, visitorQuery, pendingQuery])
  const todaySettlements = (settlements.data ?? []) as unknown as Settlement[]
  const totals = settlementTotals.data ?? []
  const salesTotal = totals.reduce((sum, item) => sum + Number(item.gross_sales), 0)
  const auctioneerCommissionTotal = totals.reduce((sum, item) => sum + Number(item.auctioneer_commission), 0)
  const platformCommissionTotal = totals.reduce((sum, item) => sum + Number(item.platform_commission), 0)

  return {
    entries: (entries.data ?? []) as MarketEntry[],
    settlements: todaySettlements,
    entryCount: entries.count ?? 0,
    visitorCount: visitors.count ?? 0,
    settlementCount: settlements.count ?? 0,
    salesTotal,
    auctioneerCommissionTotal,
    platformCommissionTotal,
    netCommissionTotal: auctioneerCommissionTotal - platformCommissionTotal,
    pendingUsers: pending.count ?? 0,
  }
}
