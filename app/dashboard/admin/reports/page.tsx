import { requireAdminPage } from "@/lib/admin"
import { getAdminReport } from "@/lib/reports"
import { ReportsWorkspace } from "@/components/dashboard/reports-workspace"

const datePattern = /^\d{4}-\d{2}-\d{2}$/

function riyadhDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Riyadh",
  }).format(date)
}

function shiftDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function parseRange(from?: string, to?: string) {
  const today = riyadhDateKey()
  const fallback = { startDate: shiftDate(today, -29), endDate: today, notice: undefined as string | undefined }
  if (!from && !to) return fallback
  if (!from || !to || !datePattern.test(from) || !datePattern.test(to)) {
    return { ...fallback, notice: "تعذر قراءة الفترة المطلوبة؛ تم عرض آخر 30 يومًا." }
  }

  const start = new Date(`${from}T12:00:00Z`)
  const end = new Date(`${to}T12:00:00Z`)
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  if (!Number.isFinite(days) || days < 0 || days > 365) {
    return { ...fallback, notice: "يجب أن يبدأ التقرير قبل تاريخ النهاية وألا تتجاوز الفترة سنة واحدة." }
  }

  return { startDate: from, endDate: to, notice: undefined as string | undefined }
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdminPage()
  const params = await searchParams
  const range = parseRange(params.from, params.to)
  const report = await getAdminReport(range.startDate, range.endDate)

  return (
    <ReportsWorkspace
      report={report}
      startDate={range.startDate}
      endDate={range.endDate}
      rangeNotice={range.notice}
      generatedAt={new Date().toISOString()}
    />
  )
}
