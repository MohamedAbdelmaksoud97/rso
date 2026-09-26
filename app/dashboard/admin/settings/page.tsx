import { Settings2Icon } from "lucide-react"
import { SiteSettingsForm } from "@/components/forms/site-settings-form"
import { Badge } from "@/components/ui/badge"
import { requireAdminPage } from "@/lib/admin"
import { getSiteSettings } from "@/lib/queries"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  await requireAdminPage()
  const [messages, settings] = await Promise.all([searchParams, getSiteSettings()])

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7">
        <Badge variant="secondary"><Settings2Icon />تخصيص المنصة</Badge>
        <h1 className="mt-3 text-3xl font-black">إعدادات الصفحة العامة</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">تحكم في محتوى الصفحة الرئيسية، الأقسام المتاحة للزوار، والبيانات التي تظهر عند التحقق من السند.</p>
      </div>
      <SiteSettingsForm key={settings.updated_at} settings={settings} {...messages} />
    </div>
  )
}
