import Link from "next/link"
import { ArrowLeftIcon, BanknoteIcon, FileCheck2Icon, GavelIcon, PackageCheckIcon, QrCodeIcon, UserCheckIcon, UsersIcon, WalletCardsIcon } from "lucide-react"
import { RealtimeSupervisor } from "@/components/dashboard/realtime-supervisor"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate, formatNumber, roleLabels } from "@/lib/constants"
import { getCurrentProfile, getDashboardData } from "@/lib/queries"
import { createClient } from "@/lib/server"

export default async function DashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile || !profile.role) return null
  const data = await getDashboardData(profile)
  const supabase = await createClient()
  const { data: events } = profile.role === "admin" ? await supabase.from("activity_events").select("id,summary,created_at,event_type").order("created_at", { ascending: false }).limit(8) : { data: [] }
  const primaryAction = profile.role === "gatekeeper" ? { href: "/dashboard/entries/new", label: "تسجيل بائع أو زائر", icon: QrCodeIcon } : profile.role === "auctioneer" ? { href: "/dashboard/settlements/new", label: "مسح QR وتوثيق ترسية", icon: GavelIcon } : { href: "/dashboard/admin/users", label: "مراجعة طلبات الموظفين", icon: UserCheckIcon }

  return <div className="mx-auto flex max-w-7xl flex-col gap-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Badge variant="secondary">{roleLabels[profile.role]}</Badge><h1 className="mt-3 text-3xl font-black">لوحة العمليات</h1><p className="mt-1 text-muted-foreground">ملخص أداء السوق والعمليات المتاحة لك اليوم.</p></div><Button render={<Link href={primaryAction.href} />} nativeButton={false} size="lg"><primaryAction.icon data-icon="inline-start" />{primaryAction.label}</Button></div>
    <div className={profile.role === "admin" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-5" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"}><StatCard icon={PackageCheckIcon} label="دخولات البائعين اليوم" value={formatNumber(data.entryCount)} detail="البائعون المسجلون اليوم" />{profile.role === "admin" && <StatCard icon={UsersIcon} label="زوار اليوم" value={formatNumber(data.visitorCount)} detail="الزيارات المسجلة اليوم" />}<StatCard icon={FileCheck2Icon} label="صفقات اليوم" value={formatNumber(data.settlementCount)} detail="سندات موثقة" /><StatCard icon={BanknoteIcon} label="قيمة الترسية" value={formatCurrency(data.salesTotal)} detail="إجمالي اليوم" />{profile.role !== "gatekeeper" && <StatCard icon={WalletCardsIcon} label={profile.role === "admin" ? "عمولة المنصة" : "صافي عمولتي"} value={formatCurrency(profile.role === "admin" ? data.platformCommissionTotal : data.netCommissionTotal)} detail={profile.role === "admin" ? "إجمالي اليوم" : "بعد حصة المنصة"} />}</div>
    <div className={profile.role === "admin" ? "grid gap-6 xl:grid-cols-[1.45fr_.55fr]" : "grid gap-6"}><Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle>أحدث صفقات اليوم</CardTitle><CardDescription>السندات التي تم توثيقها مؤخراً</CardDescription></div><Button render={<Link href="/dashboard/receipts" />} nativeButton={false} variant="ghost">عرض الكل<ArrowLeftIcon data-icon="inline-end" /></Button></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>رقم السند</TableHead><TableHead>المشتري</TableHead><TableHead>السعر</TableHead><TableHead>الوقت</TableHead></TableRow></TableHeader><TableBody>{data.settlements.length === 0 ? <TableRow><TableCell colSpan={4} className="h-28 text-center text-muted-foreground">لا توجد صفقات مسجلة اليوم.</TableCell></TableRow> : data.settlements.map((item) => <TableRow key={item.id}><TableCell><Link href={`/dashboard/receipts/${item.receipt_number}`} className="font-bold text-primary" dir="ltr">{item.receipt_number}</Link></TableCell><TableCell>{item.buyer_name}</TableCell><TableCell>{formatCurrency(item.final_price)}</TableCell><TableCell>{formatDate(item.settled_at)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>{profile.role === "admin" && <RealtimeSupervisor initialEvents={(events ?? []) as { id: number; summary: string; created_at: string; event_type: string }[]} />}</div>
  </div>
}

function StatCard({ icon: Icon, label, value, detail }: { icon: typeof PackageCheckIcon; label: string; value: string; detail: string }) { return <Card><CardHeader className="flex flex-row items-start justify-between"><div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 text-2xl">{value}</CardTitle></div><div className="flex size-10 items-center justify-center rounded-xl bg-secondary/35 text-primary"><Icon /></div></CardHeader><CardContent><p className="text-xs text-muted-foreground">{detail}</p></CardContent></Card> }
