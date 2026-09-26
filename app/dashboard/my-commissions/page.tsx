import Link from "next/link"
import { ArrowLeftIcon, BanknoteIcon, CalendarDaysIcon, FileCheck2Icon, PercentIcon, ReceiptTextIcon, WalletCardsIcon } from "lucide-react"
import { requireRolePage } from "@/lib/admin"
import { formatCurrency, formatDate, formatNumber } from "@/lib/constants"
import { createClient } from "@/lib/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type DailyCommission = {
  business_date: string
  deals_count: number
  gross_sales: number
  auctioneer_commission: number
  platform_commission: number
  net_commission: number
}

type CommissionSettlement = {
  id: number
  receipt_number: string
  final_price: number
  auctioneer_commission: number
  platform_commission: number
  settled_at: string
}

export default async function MyCommissionsPage() {
  const profile = await requireRolePage(["auctioneer"])
  const supabase = await createClient()
  const [{ data: active }, { data: daily }, { data: settlements }] = await Promise.all([
    supabase.from("commission_settings").select("auctioneer_rate_percent,platform_rate_percent").eq("is_active", true).maybeSingle(),
    supabase.from("daily_commission_summary").select("business_date,deals_count,gross_sales,auctioneer_commission,platform_commission,net_commission").eq("auctioneer_id", profile.id).order("business_date", { ascending: false }).limit(30),
    supabase.from("auction_settlements").select("id,receipt_number,final_price,auctioneer_commission,platform_commission,settled_at").eq("auctioneer_id", profile.id).order("settled_at", { ascending: false }).limit(100),
  ])

  const days = (daily ?? []) as DailyCommission[]
  const recentSettlements = (settlements ?? []) as CommissionSettlement[]
  const totals = days.reduce((result, day) => ({
    deals: result.deals + Number(day.deals_count),
    sales: result.sales + Number(day.gross_sales),
    grossCommission: result.grossCommission + Number(day.auctioneer_commission),
    platformCommission: result.platformCommission + Number(day.platform_commission),
    netCommission: result.netCommission + Number(day.net_commission),
  }), { deals: 0, sales: 0, grossCommission: 0, platformCommission: 0, netCommission: 0 })

  return <div className="mx-auto flex max-w-7xl flex-col gap-7">
    <div>
      <Badge variant="secondary"><WalletCardsIcon />المستحقات الشخصية</Badge>
      <h1 className="mt-3 text-3xl font-black">عمولاتي وتسوياتي</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">تابع صفقاتك وعمولتك وحصة المنصة وصافي مستحقاتك خلال آخر 30 يوم عمل.</p>
    </div>

    <Card className="border-primary/15 bg-primary text-primary-foreground">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-primary-foreground/70">النسب المطبقة على الصفقات الجديدة</p>
          <p className="mt-1 text-lg font-bold">عمولتك {formatNumber(active?.auctioneer_rate_percent)}% · حصة المنصة {formatNumber(active?.platform_rate_percent)}%</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-primary-foreground/10 px-4 py-3 text-sm">
          <PercentIcon className="size-5" />الصافي = عمولتك − حصة المنصة
        </div>
      </CardContent>
    </Card>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      <Metric icon={FileCheck2Icon} label="عدد الصفقات" value={formatNumber(totals.deals)} />
      <Metric icon={BanknoteIcon} label="قيمة الترسية" value={formatCurrency(totals.sales)} />
      <Metric icon={PercentIcon} label="إجمالي عمولتي" value={formatCurrency(totals.grossCommission)} />
      <Metric icon={ReceiptTextIcon} label="حصة المنصة" value={formatCurrency(totals.platformCommission)} />
      <Metric icon={WalletCardsIcon} label="صافي مستحقاتي" value={formatCurrency(totals.netCommission)} featured />
    </div>

    <Card>
      <CardHeader><CardTitle>التسويات اليومية</CardTitle><CardDescription>إجمالي كل يوم حسب الصفقات التي وثقتها.</CardDescription></CardHeader>
      <CardContent>{days.length === 0 ? <CommissionEmpty /> : <Table><TableHeader><TableRow><TableHead>اليوم</TableHead><TableHead>الصفقات</TableHead><TableHead>إجمالي الترسية</TableHead><TableHead>عمولتي</TableHead><TableHead>حصة المنصة</TableHead><TableHead>الصافي</TableHead></TableRow></TableHeader><TableBody>{days.map((day) => <TableRow key={day.business_date}><TableCell className="font-medium">{formatDate(day.business_date)}</TableCell><TableCell>{formatNumber(day.deals_count)}</TableCell><TableCell>{formatCurrency(day.gross_sales)}</TableCell><TableCell>{formatCurrency(day.auctioneer_commission)}</TableCell><TableCell>{formatCurrency(day.platform_commission)}</TableCell><TableCell className="font-bold text-primary">{formatCurrency(day.net_commission)}</TableCell></TableRow>)}</TableBody></Table>}</CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>أحدث الصفقات</CardTitle><CardDescription>آخر 100 صفقة موثقة من حسابك مع تفاصيل العمولة.</CardDescription></CardHeader>
      <CardContent>{recentSettlements.length === 0 ? <CommissionEmpty /> : <Table><TableHeader><TableRow><TableHead>السند</TableHead><TableHead>التاريخ</TableHead><TableHead>سعر الترسية</TableHead><TableHead>عمولتي</TableHead><TableHead>حصة المنصة</TableHead><TableHead>الصافي</TableHead><TableHead>الإجراء</TableHead></TableRow></TableHeader><TableBody>{recentSettlements.map((settlement) => <TableRow key={settlement.id}><TableCell className="font-bold" dir="ltr">{settlement.receipt_number}</TableCell><TableCell>{formatDate(settlement.settled_at)}</TableCell><TableCell>{formatCurrency(settlement.final_price)}</TableCell><TableCell>{formatCurrency(settlement.auctioneer_commission)}</TableCell><TableCell>{formatCurrency(settlement.platform_commission)}</TableCell><TableCell className="font-bold text-primary">{formatCurrency(Number(settlement.auctioneer_commission) - Number(settlement.platform_commission))}</TableCell><TableCell><Button render={<Link href={`/dashboard/receipts/${settlement.receipt_number}`} />} nativeButton={false} size="sm" variant="ghost">عرض السند<ArrowLeftIcon data-icon="inline-end" /></Button></TableCell></TableRow>)}</TableBody></Table>}</CardContent>
    </Card>
  </div>
}

function Metric({ icon: Icon, label, value, featured = false }: { icon: typeof CalendarDaysIcon; label: string; value: string; featured?: boolean }) {
  return <Card className={featured ? "bg-secondary/20 ring-primary/20" : undefined}><CardHeader className="flex flex-row items-start justify-between"><div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 text-xl">{value}</CardTitle></div><div className="flex size-10 items-center justify-center rounded-xl bg-secondary/35 text-primary"><Icon /></div></CardHeader></Card>
}

function CommissionEmpty() {
  return <Empty><EmptyHeader><EmptyMedia variant="icon"><CalendarDaysIcon /></EmptyMedia><EmptyTitle>لا توجد تسويات بعد</EmptyTitle><EmptyDescription>ستظهر عمولاتك هنا بعد إصدار أول سند ترسية.</EmptyDescription></EmptyHeader></Empty>
}
