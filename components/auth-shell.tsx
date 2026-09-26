import Link from "next/link"
import { ArrowRightIcon, ShieldCheckIcon } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className="grid min-h-screen lg:grid-cols-[.9fr_1.1fr]">
    <section className="flex items-center justify-center px-5 py-12"><div className="w-full max-w-md"><Button render={<Link href="/" />} nativeButton={false} variant="ghost" className="mb-6"><ArrowRightIcon data-icon="inline-start" />العودة للرئيسية</Button><Card className="shadow-xl shadow-primary/5"><CardHeader><BrandLogo compact className="mb-5" /><h1 className="font-heading text-2xl font-medium leading-snug">{title}</h1><CardDescription className="leading-7">{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card></div></section>
    <section className="rso-grid hidden items-center justify-center bg-primary p-14 text-primary-foreground lg:flex"><div className="max-w-xl"><div className="mb-8 flex size-16 items-center justify-center rounded-2xl bg-primary-foreground/10"><ShieldCheckIcon className="size-8" /></div><h2 className="text-4xl font-black leading-tight">منظومة موثوقة لإدارة حركة المزاد كاملة.</h2><p className="mt-5 text-lg leading-9 text-primary-foreground/70">حسابك مرتبط بدور وظيفي واعتماد إداري، وكل إجراء داخل المنصة مسجل ومحمي وفق صلاحياتك المعتمدة.</p><div className="mt-10 grid grid-cols-3 gap-3 text-center"><div className="rounded-2xl bg-primary-foreground/8 p-4"><p className="text-2xl font-bold">3</p><p className="text-xs opacity-70">أدوار واضحة</p></div><div className="rounded-2xl bg-primary-foreground/8 p-4"><p className="text-2xl font-bold">24/7</p><p className="text-xs opacity-70">متابعة لحظية</p></div><div className="rounded-2xl bg-primary-foreground/8 p-4"><p className="text-2xl font-bold">100%</p><p className="text-xs opacity-70">توثيق رقمي</p></div></div></div></section>
  </main>
}
