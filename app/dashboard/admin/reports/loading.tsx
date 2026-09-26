import { Skeleton } from "@/components/ui/skeleton"

export default function ReportsLoading() {
  return <div className="mx-auto flex max-w-7xl flex-col gap-6" role="status" aria-label="جاري إعداد التقارير">
    <div className="flex flex-col gap-3"><Skeleton className="h-7 w-32" /><Skeleton className="h-10 w-72 max-w-full" /><Skeleton className="h-5 w-[34rem] max-w-full" /></div>
    <Skeleton className="h-44 w-full rounded-xl" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
    <div className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-96 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>
    <span className="sr-only">جاري إعداد التقارير…</span>
  </div>
}
