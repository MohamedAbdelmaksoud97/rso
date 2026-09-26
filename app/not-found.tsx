import Link from "next/link"
import { ArrowRightIcon, SearchXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center px-5 py-12"><Card className="w-full max-w-lg text-center"><CardHeader><div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted text-primary"><SearchXIcon /></div><CardTitle>الصفحة غير موجودة</CardTitle><CardDescription>قد يكون الرابط غير صحيح أو أن المحتوى لم يعد متاحًا.</CardDescription></CardHeader><CardContent><Button render={<Link href="/" />} nativeButton={false}><ArrowRightIcon data-icon="inline-start" />العودة للرئيسية</Button></CardContent></Card></main>
}
