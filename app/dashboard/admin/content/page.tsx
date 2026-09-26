import Link from "next/link"
import { CalendarClockIcon, Edit3Icon, EyeIcon, EyeOffIcon, MegaphoneIcon, NewspaperIcon, PlusIcon, SaveIcon, SparklesIcon } from "lucide-react"
import { createContentPost, setContentPostPublished, updateContentPost } from "@/app/actions/content"
import { ContentFeedback } from "@/components/content/content-feedback"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { requireAdminPage } from "@/lib/admin"
import { formatDate } from "@/lib/constants"
import { createClient } from "@/lib/server"
import type { ContentPost } from "@/lib/types"

function toRiyadhInput(value?: string | null) {
  const date = value ? new Date(value) : new Date()
  return new Date(date.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 16)
}

function getPostStatus(post: ContentPost) {
  const now = Date.now()
  if (!post.is_published) return { label: "مسودة مخفية", variant: "outline" as const }
  if (new Date(post.publish_at).getTime() > now) return { label: "مجدول للنشر", variant: "secondary" as const }
  if (post.expires_at && new Date(post.expires_at).getTime() <= now) return { label: "انتهى ظهوره", variant: "outline" as const }
  return { label: "منشور الآن", variant: "default" as const }
}

export default async function ContentManagementPage({ searchParams }: { searchParams: Promise<{ edit?: string; error?: string; success?: string }> }) {
  await requireAdminPage()
  const params = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from("content_posts").select("id,kind,title,summary,body,is_published,is_featured,publish_at,expires_at,created_at,updated_at").order("created_at", { ascending: false })
  const posts = (data ?? []) as ContentPost[]
  const editId = Number(params.edit)
  const editing = Number.isInteger(editId) ? posts.find((post) => post.id === editId) : undefined
  const formAction = editing ? updateContentPost.bind(null, editing.id) : createContentPost

  return <div className="mx-auto flex max-w-7xl flex-col gap-7">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><Badge variant="secondary"><NewspaperIcon />المحتوى العام</Badge><h1 className="mt-3 text-3xl font-black">الأخبار والإعلانات</h1><p className="mt-2 max-w-3xl text-muted-foreground">أنشئ محتوى الصفحة الرئيسية وحدد موعد ظهوره وحالة نشره للزوار.</p></div>
      {editing && <Button render={<Link href="/dashboard/admin/content" />} nativeButton={false} variant="outline"><PlusIcon data-icon="inline-start" />إضافة محتوى جديد</Button>}
    </div>

    <ContentFeedback error={params.error} success={params.success} />

    <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <Card>
        <CardHeader><CardTitle>{editing ? "تعديل المحتوى" : "إضافة خبر أو إعلان"}</CardTitle><CardDescription>{editing ? "ستنعكس التعديلات على الصفحة العامة فور الحفظ وفق حالة النشر." : "اكتب محتوى واضحًا وحدد متى يبدأ ظهوره للزوار."}</CardDescription></CardHeader>
        <CardContent><form action={formAction}><FieldGroup>
          <Field><FieldLabel htmlFor="kind">نوع المحتوى</FieldLabel><NativeSelect id="kind" name="kind" defaultValue={editing?.kind ?? "news"} className="w-full"><NativeSelectOption value="news">خبر</NativeSelectOption><NativeSelectOption value="announcement">إعلان</NativeSelectOption></NativeSelect></Field>
          <Field><FieldLabel htmlFor="title">العنوان</FieldLabel><Input id="title" name="title" required minLength={3} maxLength={140} defaultValue={editing?.title ?? ""} placeholder="عنوان واضح ومباشر" /></Field>
          <Field><FieldLabel htmlFor="summary">الملخص</FieldLabel><Textarea id="summary" name="summary" required minLength={10} maxLength={320} rows={3} defaultValue={editing?.summary ?? ""} placeholder="ملخص قصير يظهر في بطاقة الصفحة الرئيسية" /><FieldDescription>من 10 إلى 320 حرفًا.</FieldDescription></Field>
          <Field><FieldLabel htmlFor="body">التفاصيل</FieldLabel><Textarea id="body" name="body" required minLength={10} maxLength={10000} rows={8} defaultValue={editing?.body ?? ""} placeholder="اكتب تفاصيل الخبر أو الإعلان هنا" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field><FieldLabel htmlFor="publish_at">موعد بدء الظهور</FieldLabel><Input id="publish_at" name="publish_at" type="datetime-local" required defaultValue={toRiyadhInput(editing?.publish_at)} /><FieldDescription>بتوقيت الرياض.</FieldDescription></Field>
            <Field><FieldLabel htmlFor="expires_at">موعد انتهاء الظهور</FieldLabel><Input id="expires_at" name="expires_at" type="datetime-local" defaultValue={editing?.expires_at ? toRiyadhInput(editing.expires_at) : ""} /><FieldDescription>اختياري؛ اتركه فارغًا ليستمر الظهور.</FieldDescription></Field>
          </div>
          <Field orientation="horizontal" className="rounded-xl border p-4"><Switch id="is_published" name="is_published" defaultChecked={editing?.is_published ?? true} /><div><FieldLabel htmlFor="is_published">نشر المحتوى</FieldLabel><FieldDescription>إذا كان الموعد مستقبليًا سيظهر تلقائيًا عند حلول موعده.</FieldDescription></div></Field>
          <Field orientation="horizontal" className="rounded-xl border p-4"><Switch id="is_featured" name="is_featured" defaultChecked={editing?.is_featured ?? false} /><div><FieldLabel htmlFor="is_featured">محتوى بارز</FieldLabel><FieldDescription>يظهر بحجم أكبر وفي مقدمة قسم الأخبار.</FieldDescription></div></Field>
          <Field><PendingSubmitButton pendingText={editing ? "جاري حفظ التعديلات…" : "جاري نشر المحتوى…"} size="lg" className="w-full"><SaveIcon data-icon="inline-start" />{editing ? "حفظ التعديلات" : "حفظ المحتوى"}</PendingSubmitButton></Field>
        </FieldGroup></form></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>سجل المحتوى</CardTitle><CardDescription>{posts.length} {posts.length === 1 ? "محتوى مسجل" : "محتويات مسجلة"}، بما فيها المسودات والمحتوى المجدول.</CardDescription></CardHeader>
        <CardContent>{posts.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><NewspaperIcon /></EmptyMedia><EmptyTitle>لا توجد أخبار أو إعلانات</EmptyTitle><EmptyDescription>استخدم النموذج لإضافة أول محتوى يظهر لزوار المنصة.</EmptyDescription></EmptyHeader></Empty> : <Table><TableHeader><TableRow><TableHead>المحتوى</TableHead><TableHead>الحالة</TableHead><TableHead>بدء الظهور</TableHead><TableHead>الإجراءات</TableHead></TableRow></TableHeader><TableBody>{posts.map((post) => {
          const status = getPostStatus(post)
          const toggleAction = setContentPostPublished.bind(null, post.id, !post.is_published)
          return <TableRow key={post.id}><TableCell><div className="max-w-sm"><div className="flex items-center gap-2"><Badge variant="outline">{post.kind === "news" ? <NewspaperIcon /> : <MegaphoneIcon />}{post.kind === "news" ? "خبر" : "إعلان"}</Badge>{post.is_featured && <Badge variant="secondary"><SparklesIcon />بارز</Badge>}</div><p className="mt-2 font-bold whitespace-normal">{post.title}</p><p className="mt-1 line-clamp-2 text-xs leading-6 whitespace-normal text-muted-foreground">{post.summary}</p></div></TableCell><TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell><TableCell><span className="flex items-center gap-2"><CalendarClockIcon className="size-4 text-muted-foreground" />{formatDate(post.publish_at)}</span></TableCell><TableCell><div className="flex items-center gap-1"><Button render={<Link href={`/dashboard/admin/content?edit=${post.id}`} />} nativeButton={false} size="sm" variant="ghost"><Edit3Icon />تعديل</Button><form action={toggleAction}><PendingSubmitButton pendingText="جاري التحديث…" size="sm" variant="ghost">{post.is_published ? <EyeOffIcon /> : <EyeIcon />}{post.is_published ? "إخفاء" : "نشر"}</PendingSubmitButton></form></div></TableCell></TableRow>
        })}</TableBody></Table>}</CardContent>
      </Card>
    </div>
  </div>
}
