import Link from "next/link"
import { ArrowLeftIcon, BadgeCheckIcon, FileCheck2Icon, GavelIcon, QrCodeIcon, SearchIcon, ShieldCheckIcon, SparklesIcon, UsersIcon } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { Badge } from "@/components/ui/badge"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { formatNumber } from "@/lib/constants"
import { getPublicMarketStats, getSiteSettings } from "@/lib/queries"

const workflow = [
  { icon: UsersIcon, number: "01", title: "تسجيل الدخول للسوق", description: "يوثق البواب بيانات المورد والبضاعة ويصدر بطاقة QR فريدة قابلة للطباعة." },
  { icon: QrCodeIcon, number: "02", title: "مسح البضاعة", description: "يمسح الدلّال الكود من هاتفه ليصل فوراً إلى بيانات البضاعة المسجلة." },
  { icon: FileCheck2Icon, number: "03", title: "سند ترسية موثّق", description: "تُسجّل بيانات المشتري والسعر وتُحسب العمولات ويصدر سند قابل للطباعة." },
]

export default async function Home() {
  const [settings, stats] = await Promise.all([getSiteSettings(), getPublicMarketStats()])

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="relative border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <BrandLogo compact />
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex" aria-label="التنقل الرئيسي">
            <a href="#how-it-works" className="text-muted-foreground transition-colors hover:text-foreground">كيف تعمل؟</a>
            <a href="#governance" className="text-muted-foreground transition-colors hover:text-foreground">الحوكمة والشفافية</a>
            <Link href="/verify" className="text-muted-foreground transition-colors hover:text-foreground">التحقق من سند</Link>
          </nav>
          <Button render={<Link href="/auth/login" />} nativeButton={false} size="lg">دخول الموظفين<ArrowLeftIcon data-icon="inline-end" /></Button>
        </div>
      </header>

      <section className="rso-grid relative">
        <div className="absolute inset-x-0 top-0 h-px gold-line" />
        <div className="mx-auto grid min-h-[640px] max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-28">
          <div className="flex flex-col items-start gap-7">
            <Badge variant="secondary" className="gap-2 px-3 py-1.5"><SparklesIcon />{settings.announcement ?? "منصة وطنية لحوكمة المزادات"}</Badge>
            <div className="flex flex-col gap-5">
              <p className="text-sm font-semibold tracking-[0.2em] text-primary">من بوابة السوق إلى سند الترسية</p>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.35] tracking-tight sm:text-6xl lg:text-7xl">{settings.hero_title}</h1>
              <p className="max-w-2xl text-lg leading-9 text-muted-foreground">{settings.hero_description}</p>
            </div>
            <form action="/verify" className="w-full max-w-2xl">
              <Card className="border-primary/15 shadow-xl shadow-primary/5">
                <CardHeader className="pb-2"><CardTitle className="text-lg">تحقق من سند مزاد</CardTitle><CardDescription>أدخل رقم سند الترسية أو رقم جوال المورد</CardDescription></CardHeader>
                <CardContent>
                  <InputGroup className="h-13 bg-background">
                    <InputGroupAddon><SearchIcon /></InputGroupAddon>
                    <InputGroupInput name="q" required minLength={4} placeholder="مثال: RSO-S-20260926-000001" aria-label="رقم السند أو الجوال" />
                    <InputGroupAddon align="inline-end"><PendingSubmitButton pendingText="جاري البحث…" size="lg">تحقق الآن</PendingSubmitButton></InputGroupAddon>
                  </InputGroup>
                </CardContent>
              </Card>
            </form>
            <div className="flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><ShieldCheckIcon className="size-5 text-primary" />بيانات محمية</span>
              <span className="flex items-center gap-2"><BadgeCheckIcon className="size-5 text-primary" />سند قابل للتحقق</span>
              <span className="flex items-center gap-2"><GavelIcon className="size-5 text-primary" />حوكمة لحظية</span>
            </div>
          </div>

          <div className="relative hidden lg:block" aria-hidden="true">
            <div className="absolute -inset-12 rounded-full bg-secondary/20 blur-3xl" />
            <Card className="relative overflow-hidden border-primary/15 bg-card/95 shadow-2xl shadow-primary/10">
              <div className="bg-primary px-8 py-7 text-primary-foreground"><div className="flex items-center justify-between"><div><p className="text-sm opacity-75">حالة السوق الآن</p><p className="mt-2 text-2xl font-bold">رقابة لحظية متكاملة</p></div><div className="flex size-14 items-center justify-center rounded-2xl bg-primary-foreground/10"><GavelIcon className="size-7" /></div></div></div>
              <CardContent className="flex flex-col gap-6 p-8">
                {settings.stats_enabled ? <><div className="grid grid-cols-2 gap-4"><div className="rounded-2xl bg-muted p-5"><p className="text-sm text-muted-foreground">دخولات السوق اليوم</p><p className="mt-2 text-3xl font-extrabold">{formatNumber(stats.entriesToday)}</p></div><div className="rounded-2xl bg-secondary/35 p-5"><p className="text-sm text-muted-foreground">صفقات اليوم</p><p className="mt-2 text-3xl font-extrabold">{formatNumber(stats.settlementsToday)}</p></div>{settings.public_visitor_count_enabled && <div className="col-span-2 flex items-center justify-between rounded-2xl border border-primary/15 bg-primary/5 p-5"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><UsersIcon className="size-5" /></div><div><p className="font-bold">زوار السوق اليوم</p><p className="text-xs text-muted-foreground">عدد الزيارات المسجلة عند البوابة</p></div></div><p className="text-3xl font-extrabold text-primary">{formatNumber(stats.visitorsToday)}</p></div>}</div><div className="flex items-center gap-4 rounded-2xl border p-4"><div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BadgeCheckIcon /></div><div className="min-w-0 flex-1"><p className="font-bold">إجمالي السندات الموثقة</p><p className="text-sm text-muted-foreground">يُحدّث تلقائياً من سجلات السوق</p></div><p className="text-2xl font-black text-primary">{formatNumber(stats.verifiedReceipts)}</p></div></> : <div className="rounded-2xl border bg-muted/40 p-6 text-center"><ShieldCheckIcon className="mx-auto size-9 text-primary" /><p className="mt-3 font-bold">حوكمة آمنة للعمليات</p><p className="mt-1 text-sm leading-7 text-muted-foreground">يدير المشرف ظهور مؤشرات السوق والبيانات العامة من لوحة التحكم.</p></div>}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-card py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center"><p className="mb-3 text-sm font-bold text-primary">دورة عمل واضحة</p><h2 className="text-3xl font-black sm:text-4xl">توثيق المزاد في ثلاث خطوات</h2><p className="mt-4 leading-8 text-muted-foreground">مسار موحد يقلل الأخطاء ويمنح كل طرف سنداً موثقاً يمكن الرجوع إليه.</p></div>
          <div className="grid gap-6 md:grid-cols-3">
            {workflow.map((step) => <Card key={step.number} className="relative overflow-hidden transition-transform hover:-translate-y-1"><CardHeader><div className="mb-5 flex items-center justify-between"><div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><step.icon /></div><span className="text-4xl font-black text-muted">{step.number}</span></div><CardTitle>{step.title}</CardTitle><CardDescription className="text-base leading-7">{step.description}</CardDescription></CardHeader></Card>)}
          </div>
        </div>
      </section>

      <section id="governance" className="py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:items-center lg:px-8">
          <div className="flex flex-col gap-5"><Badge className="w-fit">حوكمة قابلة للتخصيص</Badge><h2 className="text-3xl font-black leading-tight sm:text-4xl">المعلومة الصحيحة، للشخص الصحيح، في الوقت الصحيح.</h2><p className="text-lg leading-9 text-muted-foreground">يتحكم المدير في صلاحيات الموظفين، نسب العمولات، والحقول التي تظهر للجمهور. ويشاهد حركة التسجيل والترسية لحظة بلحظة من لوحة إشرافية واحدة.</p><Button render={<Link href="/auth/register" />} nativeButton={false} variant="outline" size="lg" className="mt-2 w-fit">طلب حساب موظف<ArrowLeftIcon data-icon="inline-end" /></Button></div>
          <div className="grid gap-4 sm:grid-cols-2">{["اعتماد الموظفين وتحديد أدوارهم", "عمولات ديناميكية لكل فترة", "تحكم كامل في البيانات العامة", "متابعة فورية لحركة السوق"].map((item) => <Card key={item}><CardContent className="flex items-start gap-3 p-5"><BadgeCheckIcon className="mt-0.5 size-5 shrink-0 text-primary" /><p className="font-semibold leading-7">{item}</p></CardContent></Card>)}</div>
        </div>
      </section>

      <footer className="bg-primary text-primary-foreground"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between lg:px-8"><div><BrandLogo compact className="brightness-0 invert" /><p className="mt-2 max-w-xl text-sm leading-7 opacity-70">المنظومة الرقمية لحوكمة المزادات وتوثيق التعاملات في أسواق النفع العام.</p></div><div className="flex items-center gap-5 text-sm opacity-80"><Link href="/verify">التحقق من سند</Link><Separator orientation="vertical" className="h-4 bg-primary-foreground/20" /><Link href="/auth/login">دخول الموظفين</Link></div></div></footer>
    </main>
  )
}
