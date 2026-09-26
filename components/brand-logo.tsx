import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function BrandLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center", className)} aria-label="منصة رسو - الرئيسية">
      <Image
        src="/logo.png"
        alt="منصة رسو"
        width={compact ? 150 : 230}
        height={compact ? 50 : 76}
        className={cn("h-auto object-contain object-right", compact ? "w-36" : "w-52 md:w-64")}
        priority
      />
    </Link>
  )
}
