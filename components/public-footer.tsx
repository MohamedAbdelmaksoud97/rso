import Link from "next/link"
import { BrandLogo } from "@/components/brand-logo"
import { Separator } from "@/components/ui/separator"

type PublicFooterProps = {
  platformName: string
  publicSearchEnabled?: boolean
}

const legalLinks = [
  { href: "/refund-policy", label: "سياسة الاسترجاع وإلغاء الصفقات" },
  { href: "/terms", label: "الشروط والأحكام" },
]

export function PublicFooter({ platformName, publicSearchEnabled = false }: PublicFooterProps) {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <BrandLogo compact className="brightness-0 invert" />
            <p className="mt-2 max-w-xl text-sm leading-7 opacity-70">
              {platformName} — المنظومة الرقمية لحوكمة المزادات وتوثيق التعاملات في أسواق النفع العام.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm" aria-label="روابط المنصة العامة">
            {publicSearchEnabled && <Link className="opacity-80 transition-opacity hover:opacity-100" href="/verify">التحقق من سند</Link>}
            {legalLinks.map((link) => <Link className="opacity-80 transition-opacity hover:opacity-100" href={link.href} key={link.href}>{link.label}</Link>)}
            <Link className="opacity-80 transition-opacity hover:opacity-100" href="/auth/login">دخول الموظفين</Link>
          </nav>
        </div>
        <Separator className="bg-primary-foreground/15" />
        <p className="text-xs leading-6 opacity-60">جميع الحقوق محفوظة © {new Date().getFullYear()} {platformName}</p>
      </div>
    </footer>
  )
}
