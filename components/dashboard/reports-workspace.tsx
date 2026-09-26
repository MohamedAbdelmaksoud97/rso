"use client"

import { FormEvent, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ActivityIcon,
  BadgeCheckIcon,
  BanknoteIcon,
  BarChart3Icon,
  CalendarDaysIcon,
  DownloadIcon,
  FileTextIcon,
  GavelIcon,
  PackageIcon,
  PercentIcon,
  PrinterIcon,
  RefreshCwIcon,
  ScaleIcon,
  ShoppingCartIcon,
  StoreIcon,
  TrendingUpIcon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react"
import { CommodityPerformanceChart, ReportActivityChart, ReportSalesChart } from "@/components/dashboard/report-charts"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import { approvalLabels, formatCurrency, formatDate, formatNumber, roleLabels } from "@/lib/constants"
import type { AdminReportData } from "@/lib/types"

type ReportTab = "overview" | "settlements" | "attendance" | "team" | "commodities" | "buyers"
type CsvCell = string | number | boolean | null | undefined

const dateFormatter = new Intl.DateTimeFormat("ar-SA", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Riyadh",
})

const eventLabels: Record<string, string> = {
  entry_created: "تسجيل دخول",
  settlement_created: "توثيق ترسية",
  commission_updated: "تحديث العمولات",
  profile_approved: "اعتماد مستخدم",
  site_settings_updated: "تحديث إعدادات المنصة",
}

function reportDate(value: string) {
  return dateFormatter.format(new Date(`${value}T12:00:00+03:00`))
}

function shiftDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function rowsToCsv(rows: CsvCell[][]) {
  return rows.map((row) => row.map((cell) => {
    const raw = cell == null ? "" : String(cell)
    const protectedValue = /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw
    return `"${protectedValue.replaceAll('"', '""')}"`
  }).join(",")).join("\r\n")
}

export function ReportsWorkspace({ report, startDate, endDate, rangeNotice, generatedAt }: {
  report: AdminReportData
  startDate: string
  endDate: string
  rangeNotice?: string
  generatedAt: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<ReportTab>("overview")
  const [from, setFrom] = useState(startDate)
  const [to, setTo] = useState(endDate)
  const [preset, setPreset] = useState("custom")

  const periodLabel = useMemo(() => `${reportDate(startDate)} — ${reportDate(endDate)}`, [startDate, endDate])

  function applyPreset(value: string) {
    setPreset(value)
    if (value === "custom") return
    if (value === "today") setFrom(endDate)
    if (value === "7") setFrom(shiftDate(endDate, -6))
    if (value === "30") setFrom(shiftDate(endDate, -29))
    if (value === "90") setFrom(shiftDate(endDate, -89))
    if (value === "month") setFrom(`${endDate.slice(0, 7)}-01`)
    if (value === "year") setFrom(`${endDate.slice(0, 4)}-01-01`)
    setTo(endDate)
  }

  function updateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const start = new Date(`${from}T12:00:00Z`)
    const end = new Date(`${to}T12:00:00Z`)
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000)
    if (!from || !to || !Number.isFinite(days) || days < 0 || days > 365) {
      toast.add({
        title: "راجع فترة التقرير",
        description: "اختر تاريخ بداية يسبق تاريخ النهاية، وبحد أقصى سنة واحدة.",
        type: "warning",
      })
      return
    }

    startTransition(() => router.push(`/dashboard/admin/reports?from=${from}&to=${to}`))
  }

  function printReport() {
    const previousTitle = document.title
    document.title = `تقرير-منصة-رسو-${startDate}-${endDate}`
    window.addEventListener("afterprint", () => { document.title = previousTitle }, { once: true })
    toast.add({ title: "التقرير جاهز للطباعة", description: "اختر «حفظ بتنسيق PDF» من نافذة الطباعة لتنزيل نسخة رقمية.", type: "info" })
    window.print()
  }

  function exportCsv() {
    const { label, rows } = csvData(activeTab, report)
    const blob = new Blob(["\uFEFF", rowsToCsv(rows)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `رسو-${label}-${startDate}-${endDate}.csv`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.add({ title: "تم تصدير التقرير", description: `تم تنزيل تقرير ${label} بصيغة CSV المتوافقة مع Excel.`, type: "success" })
  }

  return (
    <div className="mx-auto max-w-7xl" data-report-root>
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" data-print-hidden>
        <div>
          <Badge variant="secondary"><BarChart3Icon />مركز التقارير</Badge>
          <h1 className="mt-3 text-3xl font-black">تقارير الأداء والتشغيل</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">رؤية موحدة لحركة السوق والصفقات والعمولات وأداء الفريق والأصناف والمشترين خلال الفترة التي تحددها.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={exportCsv}><DownloadIcon data-icon="inline-start" />تصدير CSV</Button>
          <Button type="button" onClick={printReport}><PrinterIcon data-icon="inline-start" />طباعة / حفظ PDF</Button>
        </div>
      </div>

      {rangeNotice && <Alert className="mb-5" data-print-hidden><CalendarDaysIcon /><AlertTitle>تم ضبط فترة التقرير</AlertTitle><AlertDescription>{rangeNotice}</AlertDescription></Alert>}

      <Card className="mb-6" data-print-hidden>
        <CardHeader>
          <CardTitle>فترة التقرير</CardTitle>
          <CardDescription>اختر فترة جاهزة أو حدد تاريخ البداية والنهاية. الحد الأقصى سنة واحدة.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={updateReport}>
            <FieldGroup className="grid gap-4 md:grid-cols-4 md:items-end">
              <Field>
                <FieldLabel htmlFor="report-preset">فترة سريعة</FieldLabel>
                <NativeSelect id="report-preset" className="w-full" value={preset} onChange={(event) => applyPreset(event.target.value)}>
                  <NativeSelectOption value="custom">فترة مخصصة</NativeSelectOption>
                  <NativeSelectOption value="today">اليوم</NativeSelectOption>
                  <NativeSelectOption value="7">آخر 7 أيام</NativeSelectOption>
                  <NativeSelectOption value="30">آخر 30 يومًا</NativeSelectOption>
                  <NativeSelectOption value="90">آخر 90 يومًا</NativeSelectOption>
                  <NativeSelectOption value="month">الشهر الحالي</NativeSelectOption>
                  <NativeSelectOption value="year">السنة الحالية</NativeSelectOption>
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="report-from">من تاريخ</FieldLabel>
                <Input id="report-from" type="date" value={from} max={to} onChange={(event) => { setFrom(event.target.value); setPreset("custom") }} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="report-to">إلى تاريخ</FieldLabel>
                <Input id="report-to" type="date" value={to} min={from} onChange={(event) => { setTo(event.target.value); setPreset("custom") }} required />
              </Field>
              <Field>
                <FieldLabel className="sr-only">تحديث التقرير</FieldLabel>
                <Button type="submit" size="lg" disabled={isPending} aria-busy={isPending} className="w-full">
                  {isPending ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
                  {isPending ? "جاري إعداد التقرير…" : "تحديث التقرير"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <div className="mb-6 hidden border-b pb-4 print:block">
        <p className="text-sm font-bold text-primary">منصة رسو لحوكمة المزادات</p>
        <h1 className="mt-2 text-2xl font-black">تقرير {tabLabel(activeTab)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">الفترة: {periodLabel} · تاريخ الإصدار: {formatDate(generatedAt)}</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-report-metrics>
        <MetricCard icon={BanknoteIcon} label="قيمة المبيعات" value={formatCurrency(report.summary.sales_total)} />
        <MetricCard icon={GavelIcon} label="الصفقات الموثقة" value={formatNumber(report.summary.settlements_count)} />
        <MetricCard icon={TrendingUpIcon} label="متوسط سعر الترسية" value={formatCurrency(report.summary.average_price)} />
        <MetricCard icon={PercentIcon} label="عمولة المنصة" value={formatCurrency(report.summary.platform_commission)} />
        <MetricCard icon={StoreIcon} label="إجمالي الدخول" value={formatNumber(report.summary.entries_count)} hint={`${formatNumber(report.summary.visitors_count)} زائر · ${formatNumber(report.summary.sellers_count)} بائع`} />
        <MetricCard icon={ScaleIcon} label="الوزن المسجل" value={`${formatNumber(report.summary.weight_total)} كجم`} />
        <MetricCard icon={ShoppingCartIcon} label="معدل الترسية" value={`${formatNumber(report.summary.conversion_rate)}%`} hint="مقارنة بعدد البائعين المسجلين" />
        <MetricCard icon={UsersIcon} label="الموظفون المعتمدون" value={formatNumber(report.summary.active_staff)} hint={`${formatNumber(report.summary.pending_users)} بانتظار الاعتماد`} />
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReportTab)}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto" data-print-hidden>
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="settlements">الصفقات</TabsTrigger>
          <TabsTrigger value="attendance">الحضور</TabsTrigger>
          <TabsTrigger value="team">الفريق والنظام</TabsTrigger>
          <TabsTrigger value="commodities">الأصناف</TabsTrigger>
          <TabsTrigger value="buyers">المشترون</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 flex flex-col gap-6">
          <div className="grid gap-6 xl:grid-cols-2" data-report-charts>
            <ReportCard title="حركة السوق" description="مقارنة الزوار والبائعين والترسيات يوميًا."><ReportActivityChart data={report.daily} /></ReportCard>
            <ReportCard title="اتجاه المبيعات" description="قيمة الترسية وعمولة المنصة خلال الفترة."><ReportSalesChart data={report.daily} /></ReportCard>
          </div>
          <DailyTable data={report.daily} financial />
        </TabsContent>

        <TabsContent value="settlements" className="mt-4">
          <ReportCard title="سجل الصفقات" description={`${formatNumber(report.settlements.length)} صفقة موثقة خلال الفترة.`}>
            {report.settlements.length ? <Table>
              <TableHeader><TableRow><TableHead>السند</TableHead><TableHead>التاريخ</TableHead><TableHead>المورد</TableHead><TableHead>الصنف</TableHead><TableHead>المشتري</TableHead><TableHead>الدلال</TableHead><TableHead>الترسية</TableHead><TableHead>عمولة المنصة</TableHead></TableRow></TableHeader>
              <TableBody>{report.settlements.map((row) => <TableRow key={row.id}><TableCell className="font-mono font-bold" dir="ltr">{row.receipt_number}</TableCell><TableCell>{formatDate(row.settled_at)}</TableCell><TableCell>{row.seller_name ?? "—"}</TableCell><TableCell>{row.commodity_type}</TableCell><TableCell>{row.buyer_name}</TableCell><TableCell>{row.auctioneer_name}</TableCell><TableCell className="font-bold">{formatCurrency(row.final_price)}</TableCell><TableCell>{formatCurrency(row.platform_commission)}</TableCell></TableRow>)}</TableBody>
            </Table> : <ReportEmpty icon={FileTextIcon} title="لا توجد صفقات خلال الفترة" description="وسّع نطاق التاريخ أو اختر فترة أخرى لعرض الصفقات." />}
          </ReportCard>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4 flex flex-col gap-6">
          <ReportCard title="اتجاه الحضور" description="الحركة اليومية المسجلة عند بوابة السوق."><ReportActivityChart data={report.daily} /></ReportCard>
          <DailyTable data={report.daily} />
        </TabsContent>

        <TabsContent value="team" className="mt-4 flex flex-col gap-6">
          <TeamReports report={report} />
        </TabsContent>

        <TabsContent value="commodities" className="mt-4 flex flex-col gap-6">
          <CommodityReports report={report} />
        </TabsContent>

        <TabsContent value="buyers" className="mt-4">
          <BuyerReports report={report} />
        </TabsContent>
      </Tabs>

      <p className="mt-5 text-xs text-muted-foreground" data-print-hidden>آخر إعداد للتقرير: {formatDate(generatedAt)} · جميع التواريخ محسوبة بتوقيت الرياض.</p>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, hint }: { icon: typeof BanknoteIcon; label: string; value: string; hint?: string }) {
  return <Card data-report-card><CardContent className="flex items-center gap-4 p-5"><div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon /></div><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-black">{value}</p>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}</div></CardContent></Card>
}

function ReportCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card data-report-card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>
}

function ReportEmpty({ icon: Icon, title, description }: { icon: typeof FileTextIcon; title: string; description: string }) {
  return <Empty><EmptyHeader><EmptyMedia variant="icon"><Icon /></EmptyMedia><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader></Empty>
}

function DailyTable({ data, financial = false }: { data: AdminReportData["daily"]; financial?: boolean }) {
  return <ReportCard title={financial ? "الملخص اليومي" : "تقرير الحضور اليومي"} description="التفاصيل اليومية خلال الفترة المحددة."><Table><TableHeader><TableRow><TableHead>اليوم</TableHead><TableHead>الزوار</TableHead><TableHead>البائعون</TableHead><TableHead>إجمالي الدخول</TableHead>{financial && <><TableHead>الصفقات</TableHead><TableHead>المبيعات</TableHead><TableHead>عمولة المنصة</TableHead></>}</TableRow></TableHeader><TableBody>{[...data].reverse().map((day) => <TableRow key={day.business_date}><TableCell className="font-medium">{reportDate(day.business_date)}</TableCell><TableCell>{formatNumber(day.visitors_count)}</TableCell><TableCell>{formatNumber(day.sellers_count)}</TableCell><TableCell className="font-bold">{formatNumber(day.entries_count)}</TableCell>{financial && <><TableCell>{formatNumber(day.settlements_count)}</TableCell><TableCell>{formatCurrency(day.sales_total)}</TableCell><TableCell>{formatCurrency(day.platform_commission)}</TableCell></>}</TableRow>)}</TableBody></Table></ReportCard>
}

function TeamReports({ report }: { report: AdminReportData }) {
  return <>
    <div className="grid gap-6 xl:grid-cols-2">
      <ReportCard title="أداء الدلالين" description="الصفقات والقيم والعمولات لكل دلال.">
        {report.auctioneers.length ? <Table><TableHeader><TableRow><TableHead>الدلال</TableHead><TableHead>الصفقات</TableHead><TableHead>المبيعات</TableHead><TableHead>عمولته</TableHead><TableHead>عمولة المنصة</TableHead></TableRow></TableHeader><TableBody>{report.auctioneers.map((row) => <TableRow key={row.auctioneer_id}><TableCell className="font-bold">{row.auctioneer_name}</TableCell><TableCell>{formatNumber(row.deals_count)}</TableCell><TableCell>{formatCurrency(row.sales_total)}</TableCell><TableCell>{formatCurrency(row.auctioneer_commission)}</TableCell><TableCell>{formatCurrency(row.platform_commission)}</TableCell></TableRow>)}</TableBody></Table> : <ReportEmpty icon={GavelIcon} title="لا توجد عمليات للدلالين" description="لم تُسجل صفقات خلال الفترة المحددة." />}
      </ReportCard>
      <ReportCard title="أداء البوابين" description="إجمالي الدخول المسجل لكل بواب.">
        {report.gatekeepers.length ? <Table><TableHeader><TableRow><TableHead>البواب</TableHead><TableHead>إجمالي الدخول</TableHead><TableHead>البائعون</TableHead><TableHead>الزوار</TableHead></TableRow></TableHeader><TableBody>{report.gatekeepers.map((row) => <TableRow key={row.gatekeeper_id}><TableCell className="font-bold">{row.gatekeeper_name}</TableCell><TableCell>{formatNumber(row.entries_count)}</TableCell><TableCell>{formatNumber(row.sellers_count)}</TableCell><TableCell>{formatNumber(row.visitors_count)}</TableCell></TableRow>)}</TableBody></Table> : <ReportEmpty icon={UserCheckIcon} title="لا توجد عمليات للبوابين" description="لم تُسجل دخولات خلال الفترة المحددة." />}
      </ReportCard>
    </div>
    <div className="grid gap-6 xl:grid-cols-2">
      <ReportCard title="الحسابات الجديدة" description={`${formatNumber(report.summary.new_users)} حساب جديد خلال الفترة.`}>
        {report.users.length ? <Table><TableHeader><TableRow><TableHead>الدور</TableHead><TableHead>الحالة</TableHead><TableHead>العدد</TableHead></TableRow></TableHeader><TableBody>{report.users.map((row) => <TableRow key={`${row.role}-${row.approval_status}`}><TableCell>{row.role === "unassigned" ? "لم يحدد بعد" : roleLabels[row.role]}</TableCell><TableCell><Badge variant="outline">{approvalLabels[row.approval_status]}</Badge></TableCell><TableCell className="font-bold">{formatNumber(row.users_count)}</TableCell></TableRow>)}</TableBody></Table> : <ReportEmpty icon={UsersIcon} title="لا توجد حسابات جديدة" description="لم تُنشأ حسابات خلال الفترة المحددة." />}
      </ReportCard>
      <ReportCard title="نشاط النظام" description={`${formatNumber(report.summary.events_count)} حدثًا مسجلًا خلال الفترة.`}>
        {report.activities.length ? <Table><TableHeader><TableRow><TableHead>نوع الحدث</TableHead><TableHead>العدد</TableHead></TableRow></TableHeader><TableBody>{report.activities.map((row) => <TableRow key={row.event_type}><TableCell>{eventLabels[row.event_type] ?? "عملية داخل المنصة"}</TableCell><TableCell className="font-bold">{formatNumber(row.events_count)}</TableCell></TableRow>)}</TableBody></Table> : <ReportEmpty icon={ActivityIcon} title="لا يوجد نشاط مسجل" description="لم تُسجل أحداث إدارية خلال الفترة المحددة." />}
      </ReportCard>
    </div>
  </>
}

function CommodityReports({ report }: { report: AdminReportData }) {
  if (!report.commodities.length) return <ReportCard title="تقرير الأصناف" description="الأصناف المسجلة خلال الفترة."><ReportEmpty icon={PackageIcon} title="لا توجد بيانات أصناف" description="لم تُسجل بضائع أو مبيعات خلال الفترة المحددة." /></ReportCard>
  return <>
    <ReportCard title="الأصناف الأعلى مبيعًا" description="ترتيب الأصناف حسب إجمالي قيمة الترسية."><CommodityPerformanceChart data={report.commodities} /></ReportCard>
    <ReportCard title="تفاصيل الأصناف" description="الكميات والأوزان وحركة البيع لكل صنف."><Table><TableHeader><TableRow><TableHead>الصنف</TableHead><TableHead>الدخولات</TableHead><TableHead>المباع</TableHead><TableHead>الكمية</TableHead><TableHead>الوزن</TableHead><TableHead>المبيعات</TableHead><TableHead>متوسط السعر</TableHead></TableRow></TableHeader><TableBody>{report.commodities.map((row) => <TableRow key={row.commodity_type}><TableCell className="font-bold">{row.commodity_type}</TableCell><TableCell>{formatNumber(row.entries_count)}</TableCell><TableCell>{formatNumber(row.sold_count)}</TableCell><TableCell>{formatNumber(row.quantity_total)}</TableCell><TableCell>{formatNumber(row.weight_total)} كجم</TableCell><TableCell>{formatCurrency(row.sales_total)}</TableCell><TableCell>{formatCurrency(row.average_price)}</TableCell></TableRow>)}</TableBody></Table></ReportCard>
  </>
}

function BuyerReports({ report }: { report: AdminReportData }) {
  return <ReportCard title="تحليل المشترين" description={`${formatNumber(report.summary.active_buyers)} مشترٍ معتمد نشط حاليًا.`}>
    {report.buyers.length ? <Table><TableHeader><TableRow><TableHead>المشتري</TableHead><TableHead>الجوال</TableHead><TableHead>الحالة</TableHead><TableHead>الصفقات</TableHead><TableHead>إجمالي الشراء</TableHead><TableHead>متوسط الصفقة</TableHead></TableRow></TableHeader><TableBody>{report.buyers.map((row) => <TableRow key={`${row.buyer_name}-${row.buyer_phone ?? ""}`}><TableCell className="font-bold">{row.buyer_name}</TableCell><TableCell dir="ltr" className="text-end">{row.buyer_phone ?? "—"}</TableCell><TableCell><Badge variant={row.is_approved ? "secondary" : "outline"}>{row.is_approved ? <><BadgeCheckIcon />معتمد</> : "جديد"}</Badge></TableCell><TableCell>{formatNumber(row.deals_count)}</TableCell><TableCell>{formatCurrency(row.total_spend)}</TableCell><TableCell>{formatCurrency(row.average_spend)}</TableCell></TableRow>)}</TableBody></Table> : <ReportEmpty icon={ShoppingCartIcon} title="لا توجد مشتريات خلال الفترة" description="ستظهر هنا بيانات المشترين بعد توثيق الصفقات." />}
  </ReportCard>
}

function tabLabel(tab: ReportTab) {
  return ({ overview: "الأداء العام", settlements: "الصفقات", attendance: "الحضور", team: "الفريق والنظام", commodities: "الأصناف", buyers: "المشترين" } as const)[tab]
}

function csvData(tab: ReportTab, report: AdminReportData): { label: string; rows: CsvCell[][] } {
  if (tab === "settlements") return { label: "الصفقات", rows: [["رقم السند", "التاريخ", "المورد", "جوال أو هوية المورد", "الصنف", "الكمية", "الوحدة", "الوزن كجم", "المشتري", "جوال المشتري", "الدلال", "سعر الترسية", "عمولة الدلال", "عمولة المنصة"], ...report.settlements.map((row) => [row.receipt_number, formatDate(row.settled_at), row.seller_name, row.seller_mobile_or_id, row.commodity_type, row.quantity, row.unit_label, row.total_weight_kg, row.buyer_name, row.buyer_phone, row.auctioneer_name, row.final_price, row.auctioneer_commission, row.platform_commission])] }
  if (tab === "attendance") return { label: "الحضور", rows: [["التاريخ", "الزوار", "البائعون", "إجمالي الدخول"], ...report.daily.map((row) => [row.business_date, row.visitors_count, row.sellers_count, row.entries_count])] }
  if (tab === "commodities") return { label: "الأصناف", rows: [["الصنف", "الدخولات", "المباع", "إجمالي الكمية", "إجمالي الوزن كجم", "قيمة المبيعات", "متوسط السعر"], ...report.commodities.map((row) => [row.commodity_type, row.entries_count, row.sold_count, row.quantity_total, row.weight_total, row.sales_total, row.average_price])] }
  if (tab === "buyers") return { label: "المشترون", rows: [["المشتري", "الجوال", "معتمد", "عدد الصفقات", "إجمالي الشراء", "متوسط الصفقة"], ...report.buyers.map((row) => [row.buyer_name, row.buyer_phone, row.is_approved ? "نعم" : "لا", row.deals_count, row.total_spend, row.average_spend])] }
  if (tab === "team") return { label: "الفريق-والنظام", rows: [
    ["أداء الدلالين"], ["الاسم", "الصفقات", "المبيعات", "متوسط الصفقة", "عمولة الدلال", "عمولة المنصة"], ...report.auctioneers.map((row) => [row.auctioneer_name, row.deals_count, row.sales_total, row.average_price, row.auctioneer_commission, row.platform_commission]),
    [], ["أداء البوابين"], ["الاسم", "إجمالي الدخول", "البائعون", "الزوار"], ...report.gatekeepers.map((row) => [row.gatekeeper_name, row.entries_count, row.sellers_count, row.visitors_count]),
    [], ["الحسابات الجديدة"], ["الدور", "الحالة", "العدد"], ...report.users.map((row) => [row.role === "unassigned" ? "لم يحدد" : roleLabels[row.role], approvalLabels[row.approval_status], row.users_count]),
    [], ["نشاط النظام"], ["نوع الحدث", "العدد"], ...report.activities.map((row) => [eventLabels[row.event_type] ?? row.event_type, row.events_count]),
  ] }
  return { label: "الأداء-العام", rows: [["التاريخ", "الزوار", "البائعون", "إجمالي الدخول", "الصفقات", "قيمة المبيعات", "عمولة الدلال", "عمولة المنصة"], ...report.daily.map((row) => [row.business_date, row.visitors_count, row.sellers_count, row.entries_count, row.settlements_count, row.sales_total, row.auctioneer_commission, row.platform_commission])] }
}
