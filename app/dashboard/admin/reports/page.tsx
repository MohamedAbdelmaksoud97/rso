import { CalendarDaysIcon, StoreIcon, TrendingUpIcon, UsersIcon } from "lucide-react"
import { AttendanceChart } from "@/components/dashboard/attendance-chart"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatNumber } from "@/lib/constants"
import { requireAdminPage } from "@/lib/admin"
import { getDailyAttendance } from "@/lib/queries"
import type { DailyAttendance } from "@/lib/types"

const fullDate = new Intl.DateTimeFormat("ar-SA", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Riyadh",
})

function riyadhDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Riyadh",
  }).format(date)
}

function fillLastDays(rows: DailyAttendance[], days: number) {
  const byDate = new Map(rows.map((row) => [row.business_date, row]))
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.now() - (days - 1 - index) * 86_400_000)
    const key = riyadhDateKey(date)
    return byDate.get(key) ?? { business_date: key, visitors_count: 0, sellers_count: 0, total_entries: 0 }
  })
}

export default async function AttendanceReportsPage() {
  await requireAdminPage()
  const days = fillLastDays(await getDailyAttendance(30), 30)
  const today = days.at(-1)!
  const totalVisitors = days.reduce((sum, day) => sum + day.visitors_count, 0)
  const totalSellers = days.reduce((sum, day) => sum + day.sellers_count, 0)
  const peak = days.reduce((highest, day) => day.visitors_count > highest.visitors_count ? day : highest, days[0])

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <Badge variant="secondary"><CalendarDaysIcon />تقارير الحضور</Badge>
        <h1 className="mt-3 text-3xl font-black">حركة الزوار اليومية</h1>
        <p className="mt-2 text-muted-foreground">إجماليات آخر 30 يوماً بحسب توقيت السوق في الرياض، وتشمل الزيارات المسجلة دون بيانات شخصية.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={UsersIcon} label="زوار اليوم" value={today.visitors_count} />
        <MetricCard icon={StoreIcon} label="بائعو اليوم" value={today.sellers_count} />
        <MetricCard icon={CalendarDaysIcon} label="زوار آخر 30 يوماً" value={totalVisitors} />
        <MetricCard icon={TrendingUpIcon} label="أعلى يوم زيارة" value={peak.visitors_count} hint={formatReportDate(peak.business_date)} />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>اتجاه الحضور</CardTitle><CardDescription>مقارنة يومية بين الزوار والبائعين المسجلين عند البوابة.</CardDescription></CardHeader>
        <CardContent><AttendanceChart data={days} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>التقرير اليومي</CardTitle><CardDescription>إجمالي الحركة المسجلة لكل يوم خلال الفترة.</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>اليوم</TableHead><TableHead>الزوار</TableHead><TableHead>البائعون</TableHead><TableHead>إجمالي الدخول</TableHead></TableRow></TableHeader>
            <TableBody>{[...days].reverse().map((day) => <TableRow key={day.business_date}><TableCell className="font-medium">{formatReportDate(day.business_date)}</TableCell><TableCell>{formatNumber(day.visitors_count)}</TableCell><TableCell>{formatNumber(day.sellers_count)}</TableCell><TableCell className="font-bold">{formatNumber(day.total_entries)}</TableCell></TableRow>)}</TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">إجمالي البائعين خلال الفترة: {formatNumber(totalSellers)}</p>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, hint }: { icon: typeof UsersIcon; label: string; value: number; hint?: string }) {
  return <Card><CardContent className="flex items-center gap-4 p-5"><div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-6" /></div><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black">{formatNumber(value)}</p>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}</div></CardContent></Card>
}

function formatReportDate(value: string) {
  return fullDate.format(new Date(`${value}T12:00:00+03:00`))
}
