import Link from "next/link"
import { ArrowRightIcon, BadgeCheckIcon, SearchIcon } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { PublicSettingsSync } from "@/components/public-settings-sync"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { createClient } from "@/lib/server"
import { formatCurrency, formatDate, formatNumber } from "@/lib/constants"
import { getSiteSettings } from "@/lib/queries"

type PublicReceipt = {
  receipt_number: string
  seller_name: string | null
  commodity_type: string | null
  quantity: number | null
  unit_label: string | null
  total_weight_kg: number | null
  final_price: number | null
  buyer_name: string | null
  settled_at: string | null
}

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams
  const query = q.trim()
  const settings = await getSiteSettings()

  if (!settings.public_search_enabled) {
    return <main className="min-h-screen"><PublicSettingsSync /><header className="border-b bg-background/90 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><BrandLogo compact /><Button render={<Link href="/" />} nativeButton={false} variant="ghost"><ArrowRightIcon data-icon="inline-start" />الرئيسية</Button></div></header><section className="mx-auto max-w-3xl px-5 py-14"><Alert><SearchIcon /><AlertTitle>التحقق العام متوقف مؤقتًا</AlertTitle><AlertDescription>أوقف مدير المنصة البحث العام عن السندات. يمكنك العودة إلى الصفحة الرئيسية أو المحاولة لاحقًا.</AlertDescription></Alert></section></main>
  }

  let results: PublicReceipt[] = []
  let searchError = false
  if (query.length >= 4) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("search_public_receipt", { p_query: query })
    results = (data ?? []) as PublicReceipt[]
    searchError = Boolean(error && error.code !== "PGRST202")
  }

  return <main className="min-h-screen"><PublicSettingsSync /><header className="border-b bg-background/90 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><BrandLogo compact /><Button render={<Link href="/" />} nativeButton={false} variant="ghost"><ArrowRightIcon data-icon="inline-start" />الرئيسية</Button></div></header><section className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-14">
    <div className="text-center"><Badge variant="secondary">التحقق العام</Badge><h1 className="mt-4 text-3xl font-black">تحقق من صحة سند الترسية</h1><p className="mt-3 text-muted-foreground">ابحث برقم السند أو رقم جوال المورد. تظهر الحقول التي اعتمدها مدير المنصة للنشر العام.</p></div>
    <form action="/verify"><InputGroup className="h-13 bg-card shadow-sm"><InputGroupAddon><SearchIcon /></InputGroupAddon><InputGroupInput name="q" defaultValue={query} required minLength={4} placeholder="رقم السند أو الجوال" /><InputGroupAddon align="inline-end"><PendingSubmitButton pendingText="جاري البحث…" size="lg">بحث</PendingSubmitButton></InputGroupAddon></InputGroup></form>
    {searchError && <Alert variant="destructive"><AlertTitle>تعذر إتمام البحث</AlertTitle><AlertDescription>خدمة التحقق غير متاحة مؤقتًا. انتظر قليلًا ثم حاول مرة أخرى.</AlertDescription></Alert>}
    {query.length >= 4 && results.length === 0 && !searchError && <Empty className="border bg-card"><EmptyHeader><EmptyMedia variant="icon"><SearchIcon /></EmptyMedia><EmptyTitle>لم نعثر على سند مطابق</EmptyTitle><EmptyDescription>راجع رقم السند أو الجوال وأعد المحاولة.</EmptyDescription></EmptyHeader></Empty>}
    {results.map((item) => <Card key={String(item.receipt_number)} className="overflow-hidden border-primary/20 shadow-lg"><CardHeader className="bg-primary text-primary-foreground"><div className="flex items-center justify-between gap-4"><div><CardDescription className="text-primary-foreground/70">سند ترسية موثق</CardDescription><CardTitle className="mt-1 text-2xl" dir="ltr">{String(item.receipt_number)}</CardTitle></div><BadgeCheckIcon className="size-10" /></div></CardHeader><CardContent className="grid gap-5 p-6 sm:grid-cols-2">
      {item.seller_name !== null && <DataItem label="المورد / المزارع" value={item.seller_name} />}{item.commodity_type !== null && <DataItem label="الصنف" value={item.commodity_type} />}{item.quantity !== null && <DataItem label="الكمية" value={`${formatNumber(item.quantity)} ${item.unit_label ?? "وحدة"}`} />}{item.total_weight_kg !== null && <DataItem label="الوزن الإجمالي" value={`${formatNumber(item.total_weight_kg)} كجم`} />}{item.final_price !== null && <DataItem label="سعر الترسية" value={formatCurrency(item.final_price)} />}{item.buyer_name !== null && <DataItem label="المستفيد / المشتري" value={item.buyer_name} />}{item.settled_at !== null && <DataItem label="تاريخ التوثيق" value={formatDate(item.settled_at)} />}<DataItem label="حالة السند" value="موثق في منصة رسو" />
    </CardContent></Card>)}
  </section></main>
}

function DataItem({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted p-4"><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div> }
