import { MailIcon } from "lucide-react"
import { forgotPassword } from "@/app/actions/auth"
import { AuthMessage } from "@/components/auth-message"
import { AuthShell } from "@/components/auth-shell"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const messages = await searchParams
  return <AuthShell title="استعادة كلمة المرور" description="سنرسل رابطاً آمناً إلى بريدك لتعيين كلمة مرور جديدة."><AuthMessage {...messages} /><form action={forgotPassword}><FieldGroup><Field><FieldLabel htmlFor="email">البريد الإلكتروني</FieldLabel><Input id="email" name="email" type="email" required dir="ltr" /><FieldDescription>استخدم البريد المسجل في منصة رسو.</FieldDescription></Field><Field><PendingSubmitButton pendingText="جاري إرسال الرابط…" size="lg" className="w-full"><MailIcon data-icon="inline-start" />إرسال رابط الاستعادة</PendingSubmitButton></Field></FieldGroup></form></AuthShell>
}
