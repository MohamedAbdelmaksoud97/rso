import { notFound } from "next/navigation"
import { BadgeCheckIcon, Building2Icon } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { PrintButton } from "@/components/print-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatDate, formatNumber } from "@/lib/constants"
import { createClient } from "@/lib/server"

export default async function ReceiptPage({ params }: { params: Promise<{ receipt: string }> }) {
  const { receipt } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("auction_settlements").select("*,market_entries(*),profiles!auction_settlements_auctioneer_id_fkey(full_name)").eq("receipt_number", receipt).maybeSingle()
  if (!data) notFound()
  const entry = data.market_entries as Record<string, unknown>
  const auctioneer = data.profiles as { full_name: string } | null
  return <div className="mx-auto max-w-4xl"><div className="mb-5 flex justify-end" data-print-hidden><PrintButton /></div><Card data-print-sheet className="overflow-hidden shadow-xl"><CardHeader className="border-b bg-card px-7 py-6"><div className="flex items-center justify-between gap-6"><BrandLogo /><div className="text-left"><Badge><BadgeCheckIcon />سند موثق</Badge><CardTitle className="mt-3 text-xl" dir="ltr">{data.receipt_number}</CardTitle><CardDescription>{formatDate(data.settled_at)}</CardDescription></div></div></CardHeader><CardContent className="p-7"><div className="mb-7 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-secondary/35 text-primary"><Building2Icon /></div><h1 className="mt-3 text-2xl font-black">سند ترسية مزاد</h1><p className="mt-1 text-sm text-muted-foreground">وثيقة إلكترونية صادرة عن منصة رسو</p></div><div className="grid gap-4 sm:grid-cols-2"><ReceiptItem label="المورد / المزارع" value={String(entry.person_name)} /><ReceiptItem label="رقم الجوال / الهوية" value={String(entry.mobile_or_id)} /><ReceiptItem label="نوع السلعة" value={String(entry.commodity_type)} /><ReceiptItem label="الكمية" value={`${formatNumber(entry.quantity as number)} ${String(entry.unit_label)}`} /><ReceiptItem label="الوزن الإجمالي" value={`${formatNumber(entry.total_weight_kg as number)} كجم`} /><ReceiptItem label="المستفيد / المشتري" value={data.buyer_name} /><ReceiptItem label="سعر الترسية النهائي" value={formatCurrency(data.final_price)} featured /><ReceiptItem label="الدلّال" value={auctioneer?.full_name ?? "—"} /></div><Separator className="my-7" /><div className="grid gap-4 rounded-2xl bg-muted p-5 sm:grid-cols-3"><ReceiptItem label="نسبة عمولة الدلّال" value={`${formatNumber(data.auctioneer_rate_percent)}%`} /><ReceiptItem label="عمولة الدلّال" value={formatCurrency(data.auctioneer_commission)} /><ReceiptItem label="عمولة المنصة" value={formatCurrency(data.platform_commission)} /></div><p className="mt-7 text-center text-xs leading-6 text-muted-foreground">يمكن التحقق من صحة هذا السند عبر الصفحة الرئيسية لمنصة رسو باستخدام رقم السند أو رقم جوال المورد.</p></CardContent></Card></div>
}

function ReceiptItem({ label, value, featured = false }: { label: string; value: string; featured?: boolean }) { return <div className={featured ? "rounded-xl bg-secondary/35 p-4" : "rounded-xl border p-4"}><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-1 text-base font-bold">{value}</p></div> }
