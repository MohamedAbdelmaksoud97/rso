import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRightIcon, FileTextIcon } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { PublicFooter } from "@/components/public-footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getSiteSettings } from "@/lib/queries"

type PublicLegalPageProps = {
  title: string
  description: string
  children: ReactNode
}

export async function PublicLegalPage({ title, description, children }: PublicLegalPageProps) {
  const settings = await getSiteSettings()

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b bg-card shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <BrandLogo compact />
          <Button render={<Link href="/" />} nativeButton={false} variant="outline">
            <ArrowRightIcon data-icon="inline-start" />
            العودة إلى الرئيسية
          </Button>
        </div>
      </header>

      <div className="rso-grid flex-1">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-12 sm:py-16 lg:px-8">
          <div className="flex max-w-3xl flex-col items-start gap-4">
            <Badge variant="secondary"><FileTextIcon />وثائق المنصة</Badge>
            <h1 className="text-3xl font-black leading-tight sm:text-5xl">{title}</h1>
            <p className="text-base leading-8 text-muted-foreground sm:text-lg">{description}</p>
          </div>
          <article className="flex flex-col gap-5">{children}</article>
        </div>
      </div>

      <PublicFooter platformName={settings.platform_name} publicSearchEnabled={settings.public_search_enabled} />
    </main>
  )
}
