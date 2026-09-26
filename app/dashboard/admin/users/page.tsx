import { UserCheckIcon } from "lucide-react"
import { updateUserApproval } from "@/app/actions/platform"
import { AuthMessage } from "@/components/auth-message"
import { Badge } from "@/components/ui/badge"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireAdminPage } from "@/lib/admin"
import { approvalLabels, formatDate, roleLabels } from "@/lib/constants"
import { createClient } from "@/lib/server"
import type { Profile } from "@/lib/types"

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdminPage()
  const messages = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from("profiles").select("id,full_name,email,phone,email_confirmed,role,approval_status,created_at").order("created_at", { ascending: false })
  const profiles = (data ?? []) as Profile[]
  return <div className="mx-auto max-w-7xl"><div className="mb-7"><Badge variant="secondary"><UserCheckIcon />إدارة الصلاحيات</Badge><h1 className="mt-3 text-3xl font-black">المستخدمون والاعتمادات</h1><p className="mt-2 text-muted-foreground">راجع الحسابات المفعلة بالبريد، ثم عيّن الدور والحالة.</p></div><AuthMessage {...messages} /><Card><CardHeader><CardTitle>طلبات الموظفين</CardTitle><CardDescription>{profiles.filter((item) => item.approval_status === "pending").length} طلبات بانتظار المراجعة</CardDescription></CardHeader><CardContent>{profiles.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><UserCheckIcon /></EmptyMedia><EmptyTitle>لا توجد حسابات</EmptyTitle><EmptyDescription>تظهر طلبات التسجيل هنا بعد تفعيل البريد.</EmptyDescription></EmptyHeader></Empty> : <Table><TableHeader><TableRow><TableHead>الموظف</TableHead><TableHead>التواصل</TableHead><TableHead>تأكيد البريد</TableHead><TableHead>تاريخ التسجيل</TableHead><TableHead>الحالة الحالية</TableHead><TableHead>الإجراء</TableHead></TableRow></TableHeader><TableBody>{profiles.map((profile) => <TableRow key={profile.id}><TableCell><p className="font-bold">{profile.full_name}</p><p className="text-xs text-muted-foreground">{profile.role ? roleLabels[profile.role] : "لم يحدد الدور"}</p></TableCell><TableCell><p dir="ltr" className="text-right text-sm">{profile.email}</p><p dir="ltr" className="text-right text-xs text-muted-foreground">{profile.phone ?? "—"}</p></TableCell><TableCell><Badge variant={profile.email_confirmed ? "default" : "secondary"}>{profile.email_confirmed ? "مؤكد" : "غير مؤكد"}</Badge></TableCell><TableCell>{formatDate(profile.created_at)}</TableCell><TableCell><Badge variant={profile.approval_status === "approved" ? "default" : "secondary"}>{approvalLabels[profile.approval_status]}</Badge></TableCell><TableCell><form action={updateUserApproval} className="flex flex-wrap items-center gap-2"><input type="hidden" name="user_id" value={profile.id} /><NativeSelect name="role" defaultValue={profile.role ?? "gatekeeper"}><NativeSelectOption value="gatekeeper">بوّاب</NativeSelectOption><NativeSelectOption value="auctioneer">دلّال</NativeSelectOption><NativeSelectOption value="admin">مدير</NativeSelectOption></NativeSelect><NativeSelect name="approval_status" defaultValue={profile.approval_status}><NativeSelectOption value="approved">اعتماد</NativeSelectOption><NativeSelectOption value="pending">انتظار</NativeSelectOption><NativeSelectOption value="suspended">إيقاف</NativeSelectOption><NativeSelectOption value="rejected">رفض</NativeSelectOption></NativeSelect><PendingSubmitButton pendingText="جاري الحفظ…" size="sm">حفظ</PendingSubmitButton></form></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card></div>
}
