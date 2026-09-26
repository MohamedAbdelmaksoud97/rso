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
  public_fields: Record<string, boolean>
  stats_enabled: boolean
  public_visitor_count_enabled: boolean
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
