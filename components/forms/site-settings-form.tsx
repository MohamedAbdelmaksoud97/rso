"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ExternalLinkIcon, InfoIcon, SaveIcon, SearchIcon, UsersIcon } from "lucide-react"
import { updateSiteSettings } from "@/app/actions/platform"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { getSafeUserMessage } from "@/lib/user-message"
import type { SiteSettings } from "@/lib/types"

const publicFieldOptions = [
  ["seller_name", "اسم المورد / المزارع"],
  ["commodity_type", "نوع السلعة"],
  ["quantity", "الكمية"],
  ["total_weight_kg", "الوزن الإجمالي"],
  ["final_price", "سعر الترسية"],
  ["buyer_name", "اسم المشتري"],
  ["settled_at", "تاريخ الترسية"],
] as const

type SiteSettingsFormProps = {
  settings: SiteSettings
  error?: string
  success?: string
}

export function SiteSettingsForm({ settings, error, success }: SiteSettingsFormProps) {
  const [dirty, setDirty] = useState(false)
  const safeError = getSafeUserMessage(error)
  const safeSuccess = getSafeUserMessage(success)

  useEffect(() => {
    if (safeError) {
      toast.add({
        title: "تعذر نشر الإعدادات",
        description: safeError,
        type: "error",
      })
      return
    }

    if (safeSuccess) {
      toast.add({
        title: "تم نشر الإعدادات",
        description: safeSuccess,
        type: "success",
      })
    }
  }, [safeError, safeSuccess])

  function markAsChanged() {
    if (dirty) return
    setDirty(true)
    toast.add({
      title: "تغييرات غير منشورة",
      description: "راجع الإعدادات ثم اضغط «حفظ ونشر» لتطبيقها على الصفحة العامة.",
      type: "info",
    })
  }

  return (
    <form action={updateSiteSettings} onChange={markAsChanged}>
      {(safeError || safeSuccess) && (
        <Alert variant={safeError ? "destructive" : "default"} className="mb-6" role={safeError ? "alert" : "status"} aria-live="polite">
          <AlertTitle>{safeError ? "تعذر نشر الإعدادات" : "تم النشر بنجاح"}</AlertTitle>
          <AlertDescription>{safeError ?? safeSuccess}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>محتوى الصفحة الرئيسية</CardTitle>
            <CardDescription>النصوص الأساسية التي تظهر لجميع الزوار.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="platform_name">اسم المنصة</FieldLabel>
                <Input id="platform_name" name="platform_name" defaultValue={settings.platform_name} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="announcement">الشريط التعريفي</FieldLabel>
                <Input id="announcement" name="announcement" defaultValue={settings.announcement ?? ""} />
                <FieldDescription>يظهر أعلى العنوان الرئيسي عند تفعيل الشريط التعريفي.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="hero_title">العنوان الرئيسي</FieldLabel>
                <Input id="hero_title" name="hero_title" defaultValue={settings.hero_title} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="hero_description">الوصف الرئيسي</FieldLabel>
                <Textarea id="hero_description" name="hero_description" defaultValue={settings.hero_description} rows={5} required />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>أقسام الصفحة العامة</CardTitle>
            <CardDescription>اختر الأقسام التي يمكن للزائر رؤيتها واستخدامها.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldLegend variant="label">الظهور والوظائف العامة</FieldLegend>
              <FieldDescription>لا تُنشر التغييرات إلا بعد الضغط على زر الحفظ.</FieldDescription>
              <FieldGroup>
                <VisibilitySwitch id="announcement_enabled" name="announcement_enabled" title="إظهار الشريط التعريفي" description="يعرض الرسالة المختصرة أعلى عنوان الصفحة." defaultChecked={settings.announcement_enabled} onCheckedChange={markAsChanged} />
                <VisibilitySwitch id="public_search_enabled" name="public_search_enabled" title="إتاحة البحث عن السندات" description="يظهر نموذج التحقق في الرئيسية وتعمل صفحة البحث العامة." defaultChecked={settings.public_search_enabled} icon="search" onCheckedChange={markAsChanged} />
                <VisibilitySwitch id="stats_enabled" name="stats_enabled" title="إظهار إحصاءات السوق" description="يعرض دخولات السوق والصفقات وإجمالي السندات." defaultChecked={settings.stats_enabled} onCheckedChange={markAsChanged} />
                <VisibilitySwitch id="public_visitor_count_enabled" name="public_visitor_count_enabled" title="إظهار عدد زوار اليوم" description="يظهر العدد الإجمالي فقط دون أي بيانات شخصية." defaultChecked={settings.public_visitor_count_enabled} icon="users" onCheckedChange={markAsChanged} />
                <VisibilitySwitch id="workflow_enabled" name="workflow_enabled" title="إظهار خطوات عمل المنصة" description="يعرض رحلة التوثيق من بوابة السوق إلى سند الترسية." defaultChecked={settings.workflow_enabled} onCheckedChange={markAsChanged} />
                <VisibilitySwitch id="governance_enabled" name="governance_enabled" title="إظهار قسم الحوكمة" description="يعرض مزايا الحوكمة والتحكم للزوار." defaultChecked={settings.governance_enabled} onCheckedChange={markAsChanged} />
                <VisibilitySwitch id="news_enabled" name="news_enabled" title="إظهار الأخبار والإعلانات" description="يعرض المحتوى المنشور من مركز الأخبار في الصفحة الرئيسية." defaultChecked={settings.news_enabled} onCheckedChange={markAsChanged} />
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>خصوصية السند العام</CardTitle>
            <CardDescription>حدد البيانات التي تظهر عند بحث أي شخص عن سند. رقم السند وحالة التوثيق يظهران دائمًا.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldLegend variant="label">الحقول المسموح بنشرها</FieldLegend>
              <FieldGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {publicFieldOptions.map(([key, label]) => (
                  <Field key={key} orientation="horizontal" className="rounded-xl border bg-muted/20 p-3">
                    <Checkbox id={key} name={key} defaultChecked={settings.public_fields[key] ?? false} onCheckedChange={markAsChanged} />
                    <FieldLabel htmlFor={key} className="font-normal">{label}</FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-4 z-20 mt-6 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={dirty ? "secondary" : "outline"}>{dirty ? "تغييرات غير منشورة" : "الإعدادات الحالية منشورة"}</Badge>
            <p className="hidden text-sm text-muted-foreground md:block">بعد الحفظ ستتحدث الصفحة العامة فورًا.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button render={<Link href="/" target="_blank" rel="noreferrer" />} nativeButton={false} type="button" variant="outline">
              <ExternalLinkIcon data-icon="inline-start" />معاينة الصفحة العامة
            </Button>
            <PendingSubmitButton pendingText="جاري النشر…" disabled={!dirty}>
              <SaveIcon data-icon="inline-start" />حفظ ونشر
            </PendingSubmitButton>
          </div>
        </div>
      </div>
    </form>
  )
}

function VisibilitySwitch({
  id,
  name,
  title,
  description,
  defaultChecked,
  icon,
  onCheckedChange,
}: {
  id: string
  name: string
  title: string
  description: string
  defaultChecked: boolean
  icon?: "search" | "users"
  onCheckedChange: () => void
}) {
  const Icon = icon === "search" ? SearchIcon : icon === "users" ? UsersIcon : InfoIcon

  return (
    <Field orientation="horizontal" className="rounded-xl border bg-muted/20 p-4">
      <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <FieldContent>
        <FieldLabel htmlFor={id}>{title}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch id={id} name={name} defaultChecked={defaultChecked} onCheckedChange={onCheckedChange} />
    </Field>
  )
}
