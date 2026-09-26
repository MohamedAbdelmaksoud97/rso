import Link from "next/link"
import { UserPlusIcon } from "lucide-react"
import { register } from "@/app/actions/auth"
import { AuthMessage } from "@/components/auth-message"
import { AuthShell } from "@/components/auth-shell"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const messages = await searchParams
  return <AuthShell title="طلب حساب موظف" description="بعد تفعيل بريدك، يراجع المدير الطلب ويحدد دورك كدلّال أو بوّاب قبل السماح بالدخول."><AuthMessage {...messages} /><form action={register}><FieldGroup><Field><FieldLabel htmlFor="full_name">الاسم الكامل</FieldLabel><Input id="full_name" name="full_name" required minLength={2} /></Field><Field><FieldLabel htmlFor="phone">رقم الجوال</FieldLabel><Input id="phone" name="phone" inputMode="tel" required dir="ltr" placeholder="05xxxxxxxx" /></Field><Field><FieldLabel htmlFor="email">البريد الإلكتروني</FieldLabel><Input id="email" name="email" type="email" required autoComplete="email" dir="ltr" /></Field><Field><FieldLabel htmlFor="password">كلمة المرور</FieldLabel><Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" dir="ltr" /><FieldDescription>8 أحرف على الأقل. سيصلك رابط لتفعيل البريد.</FieldDescription></Field><Field><PendingSubmitButton pendingText="جاري إنشاء الطلب…" size="lg" className="w-full"><UserPlusIcon data-icon="inline-start" />إنشاء الطلب</PendingSubmitButton></Field></FieldGroup></form><p className="mt-6 text-center text-sm text-muted-foreground">لديك حساب؟ <Link href="/auth/login" className="font-bold text-primary hover:underline">سجّل الدخول</Link></p></AuthShell>
}
