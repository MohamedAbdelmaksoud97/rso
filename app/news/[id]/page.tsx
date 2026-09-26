import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRightIcon, CalendarDaysIcon, MegaphoneIcon, NewspaperIcon, ShieldCheckIcon } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatDateOnly } from "@/lib/constants"
import { getPublicContentPost } from "@/lib/queries"

export async function generateMetadata({ params }: PageProps<"/news/[id]">): Promise<Metadata> {
  const { id } = await params
  const post = await getPublicContentPost(Number(id))
  return post ? { title: post.title, description: post.summary } : { title: "المحتوى غير متاح" }
}

export default async function PublicContentPage({ params }: PageProps<"/news/[id]">) {
  const { id } = await params
  const postId = Number(id)
  if (!Number.isInteger(postId) || postId <= 0) notFound()
  const post = await getPublicContentPost(postId)
  if (!post) notFound()
  const Icon = post.kind === "news" ? NewspaperIcon : MegaphoneIcon

  return <main className="min-h-screen">
    <header className="border-b bg-card shadow-sm"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8"><BrandLogo compact /><Button render={<Link href="/#latest-news" />} nativeButton={false} variant="ghost"><ArrowRightIcon data-icon="inline-start" />العودة للرئيسية</Button></div></header>
    <section className="rso-grid px-5 py-12 sm:py-20 lg:px-8"><article className="mx-auto max-w-4xl"><Card className="overflow-hidden border-primary/15 shadow-xl"><CardHeader className="border-b bg-primary px-6 py-10 text-primary-foreground sm:px-10"><div className="flex flex-wrap items-center gap-3"><Badge className="bg-primary-foreground/10 text-primary-foreground"><Icon />{post.kind === "news" ? "خبر" : "إعلان"}</Badge>{post.is_featured && <Badge variant="secondary">محتوى بارز</Badge>}</div><h1 className="mt-6 text-3xl font-black leading-relaxed sm:text-5xl">{post.title}</h1><p className="mt-4 max-w-3xl text-lg leading-9 text-primary-foreground/75">{post.summary}</p><p className="mt-6 flex items-center gap-2 text-sm text-primary-foreground/65"><CalendarDaysIcon className="size-4" />{formatDateOnly(post.publish_at)}</p></CardHeader><CardContent className="p-6 sm:p-10"><div className="whitespace-pre-line text-base leading-9 sm:text-lg">{post.body}</div><Separator className="my-9" /><div className="flex items-start gap-3 rounded-2xl bg-muted p-5"><ShieldCheckIcon className="mt-0.5 size-6 shrink-0 text-primary" /><div><p className="font-bold">محتوى رسمي من إدارة منصة رسو</p><p className="mt-1 text-sm leading-7 text-muted-foreground">تم نشر هذا المحتوى عبر مركز الأخبار والإعلانات في لوحة الإدارة.</p></div></div></CardContent></Card></article></section>
  </main>
}
