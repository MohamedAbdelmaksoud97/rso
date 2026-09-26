import { Skeleton } from "@/components/ui/skeleton"

export function PageLoading({ dashboard = false }: { dashboard?: boolean }) {
  return (
    <div role="status" aria-live="polite" aria-label="جاري تحميل الصفحة" className={dashboard ? "mx-auto max-w-7xl" : "mx-auto w-full max-w-7xl px-5 py-10 lg:px-8"}>
      <span className="sr-only">جاري تحميل المحتوى…</span>
      <div className="mb-8 flex flex-col gap-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}
      </div>
      <Skeleton className="mt-6 h-80 rounded-2xl" />
    </div>
  )
}
