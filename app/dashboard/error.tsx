"use client"

import { CircleAlertIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <div className="flex min-h-[60vh] items-center justify-center"><Card className="w-full max-w-lg text-center"><CardHeader><div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><CircleAlertIcon /></div><CardTitle>تعذر تحميل هذه البيانات</CardTitle><CardDescription>لم نتمكن من إكمال الطلب الآن. تحقق من اتصالك ثم أعد المحاولة.</CardDescription></CardHeader><CardContent><Button type="button" onClick={retry}><RefreshCwIcon data-icon="inline-start" />إعادة المحاولة</Button></CardContent></Card></div>
}
