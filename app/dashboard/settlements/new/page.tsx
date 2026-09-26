import { GavelIcon } from "lucide-react"
import { SettlementForm } from "@/components/forms/settlement-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/server"
import { requireRolePage } from "@/lib/admin"
import type { MarketEntry } from "@/lib/types"

export default async function NewSettlementPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  await requireRolePage(["auctioneer", "admin"])
  const { token = "", error } = await searchParams
  const supabase = await createClient()
  const [{ data: buyers }, entryResult] = await Promise.all([supabase.from("approved_buyers").select("id,full_name,phone").eq("is_active", true).order("full_name"), token ? supabase.from("market_entries").select("*").eq("qr_token", token).eq("status", "registered").maybeSingle() : Promise.resolve({ data: null })])
  const entryError = token && !entryResult.data ? "الكود غير صالح، أو تم توثيق هذه البضاعة مسبقاً." : error
  return <div className="mx-auto max-w-4xl"><div className="mb-7"><Badge variant="secondary"><GavelIcon />مسار الدلّال</Badge><h1 className="mt-3 text-3xl font-black">توثيق ترسية المزاد</h1><p className="mt-2 text-muted-foreground">امسح بطاقة البضاعة، ثم أدخل المشتري والسعر النهائي لإصدار السند.</p></div><Card><CardHeader><CardTitle>بيانات الصفقة</CardTitle><CardDescription>تُحتسب عمولة الدلّال والمنصة تلقائياً وفق الإعدادات الفعالة.</CardDescription></CardHeader><CardContent><SettlementForm token={entryResult.data ? token : ""} entry={entryResult.data as MarketEntry | null} buyers={(buyers ?? []) as { id: number; full_name: string; phone: string | null }[]} error={entryError} /></CardContent></Card></div>
}
