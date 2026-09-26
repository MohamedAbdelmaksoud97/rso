import { redirect } from "next/navigation"
import { Clock3Icon, ShieldAlertIcon } from "lucide-react"
import { logout } from "@/app/actions/auth"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { createClient } from "@/lib/server"
import type { Profile } from "@/lib/types"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) redirect("/auth/login")
  const { data } = await supabase.from("profiles").select("id,full_name,email,phone,email_confirmed,role,approval_status,created_at").eq("id", userId).maybeSingle()
  const profile = data as Profile | null

  if (!profile) return <AccessState title="تعذر فتح مساحة العمل" description="تعذر تحميل بيانات حسابك الآن. حاول مرة أخرى أو تواصل مع مدير المنصة إذا استمرت المشكلة." icon={ShieldAlertIcon} />
  if (profile.approval_status !== "approved" || !profile.role) return <AccessState title={profile.approval_status === "pending" ? "طلبك بانتظار اعتماد المدير" : "الدخول إلى الحساب غير متاح"} description={profile.approval_status === "pending" ? "تم تفعيل بريدك بنجاح. سيحدد المدير دورك الوظيفي، وبعد الاعتماد يمكنك الدخول مباشرة." : "راجع مدير المنصة لمعرفة حالة الحساب."} icon={Clock3Icon} />

  return <SidebarProvider><AppSidebar profile={profile} /><SidebarInset><DashboardHeader profile={profile} /><div className="flex-1 p-4 md:p-7">{children}</div></SidebarInset></SidebarProvider>
}

function AccessState({ title, description, icon: Icon }: { title: string; description: string; icon: typeof Clock3Icon }) {
  return <main className="flex min-h-screen items-center justify-center px-5"><Card className="w-full max-w-lg text-center"><CardHeader><div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-secondary/40"><Icon className="size-8 text-primary" /></div><CardTitle>{title}</CardTitle></CardHeader><CardContent><Alert><AlertTitle>حالة الحساب</AlertTitle><AlertDescription>{description}</AlertDescription></Alert><form action={logout} className="mt-6"><PendingSubmitButton pendingText="جاري تسجيل الخروج…" variant="outline" className="w-full">تسجيل الخروج</PendingSubmitButton></form></CardContent></Card></main>
}
