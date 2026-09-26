import { Settings2Icon, UsersIcon } from "lucide-react"
import { updateSiteSettings } from "@/app/actions/platform"
import { AuthMessage } from "@/components/auth-message"
import { Badge } from "@/components/ui/badge"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { requireAdminPage } from "@/lib/admin"
import { getSiteSettings } from "@/lib/queries"

const publicFieldOptions = [
  ["seller_name", "اسم المورد / المزارع"], ["commodity_type", "نوع السلعة"], ["quantity", "الكمية"], ["total_weight_kg", "الوزن الإجمالي"], ["final_price", "سعر الترسية"], ["buyer_name", "اسم المشتري"], ["settled_at", "تاريخ الترسية"],
] as const

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdminPage()
  const [messages, settings] = await Promise.all([searchParams, getSiteSettings()])
  return <div className="mx-auto max-w-5xl"><div className="mb-7"><Badge variant="secondary"><Settings2Icon />تخصيص المنصة</Badge><h1 className="mt-3 text-3xl font-black">إعدادات الصفحة العامة</h1><p className="mt-2 text-muted-foreground">تحكم في الرسائل التي يراها الزائر والبيانات التي تظهر عند التحقق من السند.</p></div><form action={updateSiteSettings}><div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>محتوى الصفحة الرئيسية</CardTitle><CardDescription>يظهر مباشرة لجميع الزوار.</CardDescription></CardHeader><CardContent><AuthMessage {...messages} /><FieldGroup><Field><FieldLabel htmlFor="platform_name">اسم المنصة</FieldLabel><Input id="platform_name" name="platform_name" defaultValue={settings.platform_name} required /></Field><Field><FieldLabel htmlFor="announcement">الشريط التعريفي</FieldLabel><Input id="announcement" name="announcement" defaultValue={settings.announcement ?? ""} /></Field><Field><FieldLabel htmlFor="hero_title">العنوان الرئيسي</FieldLabel><Input id="hero_title" name="hero_title" defaultValue={settings.hero_title} required /></Field><Field><FieldLabel htmlFor="hero_description">الوصف الرئيسي</FieldLabel><Textarea id="hero_description" name="hero_description" defaultValue={settings.hero_description} rows={5} required /></Field><Field orientation="horizontal"><div className="flex-1"><FieldLabel htmlFor="stats_enabled">إظهار إحصاءات السوق</FieldLabel><FieldDescription>يعرض مؤشرات مختصرة في الصفحة العامة.</FieldDescription></div><Switch id="stats_enabled" name="stats_enabled" defaultChecked={settings.stats_enabled} /></Field><Field orientation="horizontal" className="rounded-xl border bg-muted/30 p-4"><div className="flex flex-1 items-start gap-3"><UsersIcon className="mt-1 size-5 text-primary" /><div><FieldLabel htmlFor="public_visitor_count_enabled">إظهار عدد زوار اليوم</FieldLabel><FieldDescription>يظهر العدد الإجمالي فقط دون أي بيانات شخصية.</FieldDescription></div></div><Switch id="public_visitor_count_enabled" name="public_visitor_count_enabled" defaultChecked={settings.public_visitor_count_enabled} /></Field></FieldGroup></CardContent></Card><Card><CardHeader><CardTitle>خصوصية السند العام</CardTitle><CardDescription>حدد الحقول المسموح بعرضها لأي شخص يبحث عن سند.</CardDescription></CardHeader><CardContent><FieldSet><FieldLegend variant="label">الحقول الظاهرة</FieldLegend><FieldDescription>رقم السند وحالة التوثيق يظهران دائماً.</FieldDescription><FieldGroup>{publicFieldOptions.map(([key, label]) => <Field key={key} orientation="horizontal"><Checkbox id={key} name={key} defaultChecked={settings.public_fields[key] ?? false} /><FieldLabel htmlFor={key} className="font-normal">{label}</FieldLabel></Field>)}</FieldGroup></FieldSet></CardContent></Card></div><div className="mt-6 flex justify-end"><PendingSubmitButton pendingText="جاري النشر…" size="lg">حفظ ونشر الإعدادات</PendingSubmitButton></div></form></div>
}
