"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, ComposedChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { AdminReportCommodity, AdminReportDaily } from "@/lib/types"

const shortDate = new Intl.DateTimeFormat("ar-SA", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Riyadh",
})

function dailyChartData(data: AdminReportDaily[]) {
  return data.map((day) => ({
    ...day,
    label: shortDate.format(new Date(`${day.business_date}T12:00:00+03:00`)),
  }))
}

const activityConfig = {
  visitors_count: { label: "الزوار", color: "var(--chart-3)" },
  sellers_count: { label: "البائعون", color: "var(--chart-2)" },
  settlements_count: { label: "الترسيات", color: "var(--chart-1)" },
} satisfies ChartConfig

export function ReportActivityChart({ data }: { data: AdminReportDaily[] }) {
  return (
    <div>
      <ChartContainer config={activityConfig} className="h-[320px] w-full aspect-auto">
        <ComposedChart accessibilityLayer data={dailyChartData(data)} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={34} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="visitors_count" fill="var(--color-visitors_count)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="sellers_count" fill="var(--color-sellers_count)" radius={[4, 4, 0, 0]} />
          <Line dataKey="settlements_count" stroke="var(--color-settlements_count)" strokeWidth={3} dot={false} />
        </ComposedChart>
      </ChartContainer>
      <PrintLegend items={[{ label: "الزوار", color: "var(--chart-3)" }, { label: "البائعون", color: "var(--chart-2)" }, { label: "الترسيات", color: "var(--chart-1)" }]} />
    </div>
  )
}

const salesConfig = {
  sales_total: { label: "قيمة المبيعات", color: "var(--chart-1)" },
  platform_commission: { label: "عمولة المنصة", color: "var(--chart-2)" },
} satisfies ChartConfig

export function ReportSalesChart({ data }: { data: AdminReportDaily[] }) {
  return (
    <div>
      <ChartContainer config={salesConfig} className="h-[320px] w-full aspect-auto">
        <AreaChart accessibilityLayer data={dailyChartData(data)} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
          <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(value) => Intl.NumberFormat("ar-SA", { notation: "compact" }).format(value)} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Area dataKey="sales_total" type="monotone" fill="var(--color-sales_total)" fillOpacity={0.22} stroke="var(--color-sales_total)" strokeWidth={2} />
          <Area dataKey="platform_commission" type="monotone" fill="var(--color-platform_commission)" fillOpacity={0.18} stroke="var(--color-platform_commission)" strokeWidth={2} />
        </AreaChart>
      </ChartContainer>
      <PrintLegend items={[{ label: "قيمة المبيعات", color: "var(--chart-1)" }, { label: "عمولة المنصة", color: "var(--chart-2)" }]} />
    </div>
  )
}

function PrintLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  return <div className="mt-1 hidden items-center justify-center gap-5 text-xs print:flex">{items.map((item) => <span key={item.label} className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ backgroundColor: item.color }} />{item.label}</span>)}</div>
}

const commodityConfig = {
  sales_total: { label: "قيمة المبيعات", color: "var(--chart-1)" },
} satisfies ChartConfig

export function CommodityPerformanceChart({ data }: { data: AdminReportCommodity[] }) {
  return (
    <ChartContainer config={commodityConfig} className="h-[320px] w-full aspect-auto">
      <BarChart accessibilityLayer data={data.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => Intl.NumberFormat("ar-SA", { notation: "compact" }).format(value)} />
        <YAxis dataKey="commodity_type" type="category" tickLine={false} axisLine={false} width={72} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Bar dataKey="sales_total" fill="var(--color-sales_total)" radius={[0, 5, 5, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
