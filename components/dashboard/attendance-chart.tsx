"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { DailyAttendance } from "@/lib/types"

const chartConfig = {
  visitors_count: { label: "الزوار", color: "var(--primary)" },
  sellers_count: { label: "البائعون", color: "var(--secondary)" },
} satisfies ChartConfig

const shortDate = new Intl.DateTimeFormat("ar-SA", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Riyadh",
})

export function AttendanceChart({ data }: { data: DailyAttendance[] }) {
  const chartData = data.map((day) => ({
    ...day,
    label: shortDate.format(new Date(`${day.business_date}T12:00:00+03:00`)),
  }))

  return (
    <ChartContainer config={chartConfig} className="h-[320px] w-full aspect-auto">
      <BarChart accessibilityLayer data={chartData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="visitors_count" fill="var(--color-visitors_count)" radius={[5, 5, 0, 0]} />
        <Bar dataKey="sellers_count" fill="var(--color-sellers_count)" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
