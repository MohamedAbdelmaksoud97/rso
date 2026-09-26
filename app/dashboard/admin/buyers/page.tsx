import { UsersIcon } from "lucide-react"
import { createApprovedBuyer } from "@/app/actions/platform"
import { AuthMessage } from "@/components/auth-message"
import { Badge } from "@/components/ui/badge"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireAdminPage } from "@/lib/admin"
import { formatDate } from "@/lib/constants"
import { createClient } from "@/lib/server"

export default async function BuyersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdminPage()
  const messages = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from("approved_buyers").select("id,full_name,phone,national_id,is_active,created_at").order("created_at", { ascending: false })
  return <div className="mx-auto max-w-7xl"><div className="mb-7"><Badge variant="secondary"><UsersIcon />دليل المشترين</Badge><h1 className="mt-3 text-3xl font-black">المشترون المعتمدون</h1><p className="mt-2 text-muted-foreground">أنشئ دليلاً للمشترين المتكررين ليختار منهم الدلّال بسرعة.</p></div><div className="grid gap-6 xl:grid-cols-[.7fr_1.3fr]"><Card><CardHeader><CardTitle>إضافة مشتري</CardTitle><CardDescription>يمكن البحث عنه واختياره أثناء الترسية.</CardDescription></CardHeader><CardContent><AuthMessage {...messages} /><form action={createApprovedBuyer}><FieldGroup><Field><FieldLabel htmlFor="full_name">اسم المشتري</FieldLabel><Input id="full_name" name="full_name" required /></Field><Field><FieldLabel htmlFor="phone">رقم الجوال</FieldLabel><Input id="phone" name="phone" inputMode="tel" dir="ltr" /></Field><Field><FieldLabel htmlFor="national_id">رقم الهوية / السجل</FieldLabel><Input id="national_id" name="national_id" inputMode="numeric" dir="ltr" /></Field><Field><PendingSubmitButton pendingText="جاري إضافة المشتري…" className="w-full">إضافة واعتماد</PendingSubmitButton></Field></FieldGroup></form></CardContent></Card><Card><CardHeader><CardTitle>دليل المشترين</CardTitle><CardDescription>{data?.length ?? 0} مشترٍ مسجل</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>الجوال</TableHead><TableHead>الهوية / السجل</TableHead><TableHead>تاريخ الإضافة</TableHead></TableRow></TableHeader><TableBody>{(data ?? []).map((buyer) => <TableRow key={buyer.id}><TableCell className="font-bold">{buyer.full_name}</TableCell><TableCell dir="ltr" className="text-right">{buyer.phone ?? "—"}</TableCell><TableCell dir="ltr" className="text-right">{buyer.national_id ?? "—"}</TableCell><TableCell>{formatDate(buyer.created_at)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div></div>
}
