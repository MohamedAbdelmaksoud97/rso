import { KeyRoundIcon } from "lucide-react"
import { updatePassword } from "@/app/actions/auth"
import { AuthMessage } from "@/components/auth-message"
import { AuthShell } from "@/components/auth-shell"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const messages = await searchParams
  return <AuthShell title="كلمة مرور جديدة" description="اختر كلمة مرور قوية ومختلفة عن كلمات المرور السابقة."><AuthMessage {...messages} /><form action={updatePassword}><FieldGroup><Field><FieldLabel htmlFor="password">كلمة المرور الجديدة</FieldLabel><Input id="password" name="password" type="password" minLength={8} required dir="ltr" /></Field><Field><FieldLabel htmlFor="confirm_password">تأكيد كلمة المرور</FieldLabel><Input id="confirm_password" name="confirm_password" type="password" minLength={8} required dir="ltr" /></Field><Field><PendingSubmitButton pendingText="جاري حفظ كلمة المرور…" size="lg" className="w-full"><KeyRoundIcon data-icon="inline-start" />حفظ كلمة المرور</PendingSubmitButton></Field></FieldGroup></form></AuthShell>
}
