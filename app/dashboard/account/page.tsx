import { KeyRoundIcon, UserRoundIcon } from "lucide-react"
import { changePassword } from "@/app/actions/auth"
import { AuthMessage } from "@/components/auth-message"
import { Badge } from "@/components/ui/badge"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { approvalLabels, roleLabels } from "@/lib/constants"
import { getCurrentProfile } from "@/lib/queries"

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [profile, messages] = await Promise.all([getCurrentProfile(), searchParams])
  if (!profile || !profile.role) return null
  return <div className="mx-auto max-w-5xl"><div className="mb-7"><Badge variant="secondary"><UserRoundIcon />حسابي</Badge><h1 className="mt-3 text-3xl font-black">الحساب والأمان</h1><p className="mt-2 text-muted-foreground">راجع بيانات حسابك وحدّث كلمة المرور بأمان.</p></div><div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>بيانات الموظف</CardTitle><CardDescription>بيانات حسابك المعتمدة والمسجلة في المنصة.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><Info label="الاسم" value={profile.full_name} /><Info label="البريد" value={profile.email} /><Info label="الجوال" value={profile.phone ?? "—"} /><Info label="الدور" value={roleLabels[profile.role]} /><Info label="حالة الحساب" value={approvalLabels[profile.approval_status]} /></CardContent></Card><Card><CardHeader><CardTitle>تغيير كلمة المرور</CardTitle><CardDescription>بعد الحفظ سيتم تسجيل خروج الجلسة الحالية لحماية الحساب.</CardDescription></CardHeader><CardContent><AuthMessage {...messages} /><form action={changePassword}><FieldGroup><Field><FieldLabel htmlFor="password">كلمة المرور الجديدة</FieldLabel><Input id="password" name="password" type="password" required minLength={8} dir="ltr" /><FieldDescription>استخدم 8 أحرف على الأقل.</FieldDescription></Field><Field><FieldLabel htmlFor="confirm_password">تأكيد كلمة المرور</FieldLabel><Input id="confirm_password" name="confirm_password" type="password" required minLength={8} dir="ltr" /></Field><Field><PendingSubmitButton pendingText="جاري تغيير كلمة المرور…" className="w-full"><KeyRoundIcon data-icon="inline-start" />تغيير كلمة المرور</PendingSubmitButton></Field></FieldGroup></form></CardContent></Card></div></div>
}

function Info({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-5 rounded-xl bg-muted p-4"><span className="text-sm text-muted-foreground">{label}</span><strong>{value}</strong></div> }
