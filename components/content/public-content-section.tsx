import Link from "next/link"
import { ArrowLeftIcon, CalendarDaysIcon, MegaphoneIcon, NewspaperIcon, SparklesIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateOnly } from "@/lib/constants"
import type { ContentPost } from "@/lib/types"

export function PublicContentSection({ posts }: { posts: ContentPost[] }) {
  if (posts.length === 0) return null
  const featured = posts.find((post) => post.is_featured)
  const remaining = posts.filter((post) => post.id !== featured?.id)

  return <section id="latest-news" className="border-y bg-card py-24">
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold text-primary">آخر المستجدات</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">أخبار وإعلانات منصة رسو</h2><p className="mt-3 max-w-2xl leading-8 text-muted-foreground">تابع أخبار السوق والتنبيهات والمواعيد المهمة المنشورة من إدارة المنصة.</p></div><Badge variant="secondary" className="w-fit"><SparklesIcon />محتوى موثوق من الإدارة</Badge></div>

      {featured && <Card className="relative mb-6 overflow-hidden border-primary/15 bg-primary text-primary-foreground shadow-xl">
        <div className="absolute inset-y-0 left-0 w-1/3 bg-[radial-gradient(circle_at_center,color-mix(in_oklch,var(--secondary)_28%,transparent),transparent_68%)]" aria-hidden="true" />
        <CardContent className="relative grid gap-8 p-7 md:grid-cols-[1fr_auto] md:items-center lg:p-10"><div><div className="flex flex-wrap items-center gap-2"><ContentKind kind={featured.kind} inverse /><Badge className="bg-secondary text-secondary-foreground"><SparklesIcon />بارز</Badge></div><h3 className="mt-5 max-w-4xl text-2xl font-black leading-relaxed sm:text-3xl">{featured.title}</h3><p className="mt-3 max-w-3xl text-base leading-8 text-primary-foreground/75">{featured.summary}</p><p className="mt-5 flex items-center gap-2 text-sm text-primary-foreground/65"><CalendarDaysIcon className="size-4" />{formatDateOnly(featured.publish_at)}</p></div><Button render={<Link href={`/news/${featured.id}`} />} nativeButton={false} size="lg" variant="secondary">قراءة التفاصيل<ArrowLeftIcon data-icon="inline-end" /></Button></CardContent>
      </Card>}

      {remaining.length > 0 && <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{remaining.map((post) => <Card key={post.id} className="group transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lg"><CardHeader><div className="mb-3 flex items-center justify-between gap-3"><ContentKind kind={post.kind} /><span className="text-xs text-muted-foreground">{formatDateOnly(post.publish_at)}</span></div><CardTitle className="text-xl leading-relaxed">{post.title}</CardTitle><CardDescription className="line-clamp-3 leading-7">{post.summary}</CardDescription></CardHeader><CardContent><Button render={<Link href={`/news/${post.id}`} />} nativeButton={false} variant="ghost" className="px-0 group-hover:text-primary">قراءة التفاصيل<ArrowLeftIcon data-icon="inline-end" /></Button></CardContent></Card>)}</div>}
    </div>
  </section>
}

function ContentKind({ kind, inverse = false }: { kind: ContentPost["kind"]; inverse?: boolean }) {
  const Icon = kind === "news" ? NewspaperIcon : MegaphoneIcon
  return <Badge variant={inverse ? "outline" : "secondary"} className={inverse ? "border-primary-foreground/25 text-primary-foreground" : undefined}><Icon />{kind === "news" ? "خبر" : "إعلان"}</Badge>
}
