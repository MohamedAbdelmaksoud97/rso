import { ClipboardListIcon } from "lucide-react"
import { EntryForm } from "@/components/forms/entry-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireRolePage } from "@/lib/admin"

export default async function NewEntryPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRolePage(["gatekeeper", "admin"])
  const { error } = await searchParams
  return <div className="mx-auto max-w-4xl"><div className="mb-7"><Badge variant="secondary"><ClipboardListIcon />بوابة السوق</Badge><h1 className="mt-3 text-3xl font-black">تسجيل بائع أو زائر</h1><p className="mt-2 text-muted-foreground">أدخل البيانات الأساسية. في حالة البائع ستصدر المنصة بطاقة QR للبضاعة.</p></div><Card><CardHeader><CardTitle>بيانات الدخول</CardTitle><CardDescription>الحقول المطلوبة تساعد على التحقق من السند لاحقاً.</CardDescription></CardHeader><CardContent><EntryForm error={error} /></CardContent></Card></div>
}
