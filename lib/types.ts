export type AppRole = "admin" | "auctioneer" | "gatekeeper"

export type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended"

export type Profile = {
  id: string
  full_name: string
  email: string
  phone: string | null
  email_confirmed: boolean
  role: AppRole | null
  approval_status: ApprovalStatus
  created_at: string
}

export type SiteSettings = {
  platform_name: string
  hero_title: string
  hero_description: string
  announcement: string | null
  announcement_enabled: boolean
  public_search_enabled: boolean
  workflow_enabled: boolean
  governance_enabled: boolean
  news_enabled: boolean
  public_fields: Record<string, boolean>
  stats_enabled: boolean
  public_visitor_count_enabled: boolean
  updated_at: string
}

export type ContentPost = {
  id: number
  kind: "news" | "announcement"
  title: string
  summary: string
  body: string
  is_published: boolean
  is_featured: boolean
  publish_at: string
  expires_at: string | null
  created_at: string
  updated_at: string
}

export type MarketEntry = {
  id: number
  receipt_number: string
  entry_kind: "seller" | "visitor"
  person_name: string | null
  mobile_or_id: string | null
  commodity_type: string | null
  quantity: number | null
  unit_label: string
  total_weight_kg: number | null
  qr_token: string
  status: "registered" | "sold" | "cancelled"
  created_at: string
}

export type DailyAttendance = {
  business_date: string
  visitors_count: number
  sellers_count: number
  total_entries: number
}

export type Settlement = {
  id: number
  receipt_number: string
  buyer_name: string
  buyer_phone: string | null
  final_price: number
  auctioneer_commission: number
  platform_commission: number
  settled_at: string
  market_entries?: Pick<MarketEntry, "person_name" | "commodity_type" | "quantity" | "unit_label" | "total_weight_kg"> | null
}

export type AdminReportSummary = {
  entries_count: number
  visitors_count: number
  sellers_count: number
  cancelled_entries: number
  settlements_count: number
  sales_total: number
  average_price: number
  platform_commission: number
  auctioneer_commission: number
  weight_total: number
  conversion_rate: number
  new_users: number
  events_count: number
  pending_users: number
  active_staff: number
  active_buyers: number
}

export type AdminReportDaily = {
  business_date: string
  visitors_count: number
  sellers_count: number
  entries_count: number
  settlements_count: number
  sales_total: number
  platform_commission: number
  auctioneer_commission: number
}

export type AdminReportCommodity = {
  commodity_type: string
  entries_count: number
  sold_count: number
  quantity_total: number
  weight_total: number
  sales_total: number
  average_price: number
}

export type AdminReportAuctioneer = {
  auctioneer_id: string
  auctioneer_name: string
  deals_count: number
  sales_total: number
  average_price: number
  auctioneer_commission: number
  platform_commission: number
}

export type AdminReportGatekeeper = {
  gatekeeper_id: string
  gatekeeper_name: string
  entries_count: number
  sellers_count: number
  visitors_count: number
}

export type AdminReportBuyer = {
  buyer_name: string
  buyer_phone: string | null
  is_approved: boolean
  deals_count: number
  total_spend: number
  average_spend: number
}

export type AdminReportUser = {
  role: AppRole | "unassigned"
  approval_status: ApprovalStatus
  users_count: number
}

export type AdminReportActivity = {
  event_type: string
  events_count: number
}

export type AdminReportSettlement = {
  id: number
  receipt_number: string
  buyer_name: string
  buyer_phone: string | null
  final_price: number
  auctioneer_commission: number
  platform_commission: number
  settled_at: string
  seller_name: string | null
  seller_mobile_or_id: string | null
  commodity_type: string
  quantity: number | null
  unit_label: string
  total_weight_kg: number | null
  auctioneer_name: string
}

export type AdminReportData = {
  summary: AdminReportSummary
  daily: AdminReportDaily[]
  commodities: AdminReportCommodity[]
  auctioneers: AdminReportAuctioneer[]
  gatekeepers: AdminReportGatekeeper[]
  buyers: AdminReportBuyer[]
  users: AdminReportUser[]
  activities: AdminReportActivity[]
  settlements: AdminReportSettlement[]
}
