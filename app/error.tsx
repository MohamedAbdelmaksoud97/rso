"use client"

import Link from "next/link"
import { CircleAlertIcon, HomeIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="flex min-h-screen items-center justify-center px-5 py-12"><Card className="w-full max-w-lg text-center"><CardHeader><div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><CircleAlertIcon /></div><CardTitle>تعذر عرض الصفحة</CardTitle><CardDescription>حدث عطل مؤقت أثناء تحميل المحتوى. حاول مرة أخرى، أو ارجع إلى الصفحة الرئيسية.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center"><Button type="button" onClick={retry}><RefreshCwIcon data-icon="inline-start" />إعادة المحاولة</Button><Button render={<Link href="/" />} nativeButton={false} variant="outline"><HomeIcon data-icon="inline-start" />الصفحة الرئيسية</Button></CardContent></Card></main>
}
