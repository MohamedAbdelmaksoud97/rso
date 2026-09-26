import Link from "next/link"
import { RefreshCwIcon, WifiOffIcon } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = { title: "غير متصل بالإنترنت" }

export default function OfflinePage() {
  return <main className="rso-grid flex min-h-screen items-center justify-center px-5 py-12"><Card className="w-full max-w-lg border-primary/15 text-center shadow-xl"><CardHeader><BrandLogo compact className="mx-auto mb-7" /><div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-secondary/35 text-primary"><WifiOffIcon className="size-8" /></div><CardTitle className="text-2xl">أنت غير متصل بالإنترنت</CardTitle><CardDescription className="text-base leading-7">تحقق من اتصال الشبكة ثم حاول مرة أخرى. بيانات الحساب والصفقات لا تُخزّن على الجهاز لحماية معلومات السوق.</CardDescription></CardHeader><CardContent><Button render={<Link href="/" />} nativeButton={false} size="lg" className="w-full"><RefreshCwIcon data-icon="inline-start" />إعادة المحاولة</Button></CardContent></Card></main>
}
