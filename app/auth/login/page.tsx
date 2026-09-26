import Link from "next/link"
import { LogInIcon } from "lucide-react"
import { login } from "@/app/actions/auth"
import { AuthMessage } from "@/components/auth-message"
import { AuthShell } from "@/components/auth-shell"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const messages = await searchParams
  return <AuthShell title="تسجيل دخول الموظفين" description="أدخل بريدك وكلمة المرور للوصول إلى مساحة العمل حسب صلاحيتك."><AuthMessage {...messages} /><form action={login}><FieldGroup><Field><FieldLabel htmlFor="email">البريد الإلكتروني</FieldLabel><Input id="email" name="email" type="email" autoComplete="email" required placeholder="name@example.com" dir="ltr" /></Field><Field><div className="flex items-center justify-between"><FieldLabel htmlFor="password">كلمة المرور</FieldLabel><Link href="/auth/forgot-password" className="text-xs font-semibold text-primary hover:underline">نسيت كلمة المرور؟</Link></div><Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} dir="ltr" /></Field><Field><PendingSubmitButton pendingText="جاري تسجيل الدخول…" size="lg" className="w-full"><LogInIcon data-icon="inline-start" />دخول إلى المنصة</PendingSubmitButton></Field></FieldGroup></form><p className="mt-6 text-center text-sm text-muted-foreground">ليس لديك حساب؟ <Link href="/auth/register" className="font-bold text-primary hover:underline">إنشاء طلب حساب</Link></p></AuthShell>
}
