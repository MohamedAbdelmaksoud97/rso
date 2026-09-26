export const commodityTypes = [
  "خلاص",
  "صقعي",
  "نبتة علي",
  "نبتة سيف",
  "سكري",
  "أخرى",
] as const

export const roleLabels = {
  admin: "مدير النظام",
  auctioneer: "دلّال",
  gatekeeper: "بوّاب",
} as const

export const approvalLabels = {
  pending: "بانتظار الاعتماد",
  approved: "معتمد",
  rejected: "مرفوض",
  suspended: "موقوف",
} as const

export const defaultSiteSettings = {
  platform_name: "منصة رسو",
  hero_title: "كل مزاد موثّق. كل حق محفوظ.",
  hero_description:
    "المنظومة الرقمية لحوكمة المزادات وتوثيق التعاملات في أسواق النفع العام، من بوابة السوق حتى سند الترسية.",
  announcement: "منصة موحدة لتوثيق حركة السوق لحظة بلحظة",
  announcement_enabled: true,
  public_search_enabled: true,
  workflow_enabled: true,
  governance_enabled: true,
  public_fields: {
    seller_name: true,
    commodity_type: true,
    quantity: true,
    total_weight_kg: true,
    final_price: true,
    buyer_name: true,
    settled_at: true,
  },
  stats_enabled: true,
  public_visitor_count_enabled: true,
  updated_at: "",
}

export function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

export function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(Number(value ?? 0))
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(new Date(value))
}
