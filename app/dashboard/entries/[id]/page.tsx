import { notFound } from "next/navigation"
import { BadgeCheckIcon } from "lucide-react"
import { QrCard } from "@/components/qr-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, formatNumber } from "@/lib/constants"
import { createClient } from "@/lib/server"
import type { MarketEntry } from "@/lib/types"

export default async function EntryCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("market_entries").select("*").eq("id", id).maybeSingle()
  if (!data) notFound()
  const entry = data as MarketEntry
  return <div className="mx-auto max-w-3xl">
    <Card data-print-sheet className="gap-0 overflow-hidden py-0 shadow-xl">
      <CardHeader className="gap-3 bg-primary px-6 py-8 text-center text-primary-foreground sm:px-8 sm:py-9">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
          <BadgeCheckIcon className="size-7" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl leading-tight sm:text-3xl">{entry.entry_kind === "seller" ? "بطاقة دخول البضاعة" : "تم تسجيل دخول الزائر"}</CardTitle>
          <CardDescription className="text-sm leading-7 text-primary-foreground/75 sm:text-base">{entry.entry_kind === "seller" ? "ثبّت البطاقة على البضاعة ليمسحها الدلّال عند الترسية" : "تم حفظ الزيارة ضمن إحصاءات السوق اليومية"}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className={entry.entry_kind === "seller" ? "grid gap-8 p-7 md:grid-cols-[1fr_auto] md:items-center" : "p-7"}>
        <div className="flex flex-col gap-4"><div><p className="text-xs text-muted-foreground">رقم الدخول</p><p className="mt-1 text-xl font-black" dir="ltr">{entry.receipt_number}</p></div><DataLine label={entry.entry_kind === "seller" ? "المورد" : "الزائر"} value={entry.person_name ?? "زائر غير مسمى"} /><DataLine label="الصنف" value={entry.commodity_type ?? "زيارة عامة"} /><DataLine label="الكمية" value={entry.quantity ? `${formatNumber(entry.quantity)} ${entry.unit_label}` : "—"} /><DataLine label="الوزن" value={entry.total_weight_kg ? `${formatNumber(entry.total_weight_kg)} كجم` : "—"} /><DataLine label="تاريخ الدخول" value={formatDate(entry.created_at)} /><Badge className="w-fit">{entry.entry_kind === "seller" ? "جاهزة للمزاد" : "تم التسجيل"}</Badge></div>{entry.entry_kind === "seller" && <QrCard value={entry.qr_token} />}
      </CardContent>
    </Card>
  </div>
}

function DataLine({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-5 border-b pb-3"><span className="text-sm text-muted-foreground">{label}</span><strong>{value}</strong></div> }
