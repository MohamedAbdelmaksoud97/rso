"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3Icon, CalendarDaysIcon, FileCheck2Icon, GavelIcon, HomeIcon, KeyRoundIcon, LogOutIcon, QrCodeIcon, Settings2Icon, ShieldCheckIcon, UserCheckIcon, UsersIcon } from "lucide-react"
import { logout } from "@/app/actions/auth"
import { BrandLogo } from "@/components/brand-logo"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar"
import { roleLabels } from "@/lib/constants"
import type { AppRole, Profile } from "@/lib/types"

const commonItems = [
  { href: "/dashboard", label: "نظرة عامة", icon: HomeIcon },
  { href: "/dashboard/receipts", label: "السندات والصفقات", icon: FileCheck2Icon },
  { href: "/dashboard/account", label: "الحساب والأمان", icon: KeyRoundIcon },
]

const roleItems: Record<AppRole, typeof commonItems> = {
  admin: [
    { href: "/dashboard/admin/users", label: "المستخدمون والاعتمادات", icon: UserCheckIcon },
    { href: "/dashboard/admin/buyers", label: "المشترون المعتمدون", icon: UsersIcon },
    { href: "/dashboard/admin/commissions", label: "العمولات والتسويات", icon: BarChart3Icon },
    { href: "/dashboard/admin/reports", label: "تقارير الحضور", icon: CalendarDaysIcon },
    { href: "/dashboard/admin/settings", label: "إعدادات المنصة", icon: Settings2Icon },
  ],
  gatekeeper: [{ href: "/dashboard/entries/new", label: "تسجيل دخول جديد", icon: QrCodeIcon }],
  auctioneer: [{ href: "/dashboard/settlements/new", label: "مسح وتوثيق ترسية", icon: GavelIcon }],
}

export function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const items = [...commonItems, ...(profile.role ? roleItems[profile.role] : [])]

  return <Sidebar side="right" dir="rtl" collapsible="icon">
    <SidebarHeader className="border-b border-sidebar-border p-4"><BrandLogo compact className="brightness-0 invert group-data-[collapsible=icon]:hidden" /><div className="hidden size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:flex"><ShieldCheckIcon /></div></SidebarHeader>
    <SidebarContent><SidebarGroup><SidebarGroupLabel>مساحة العمل</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{items.map((item) => <SidebarMenuItem key={item.href}><SidebarMenuButton render={<Link href={item.href} />} isActive={pathname === item.href} tooltip={item.label}><item.icon /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
    <SidebarFooter className="border-t border-sidebar-border p-3"><div className="mb-2 px-2 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-semibold">{profile.full_name}</p><p className="text-xs text-sidebar-foreground/60">{profile.role ? roleLabels[profile.role] : "بانتظار الدور"}</p></div><form action={logout}><PendingSubmitButton pendingText="جاري تسجيل الخروج…" variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><LogOutIcon data-icon="inline-start" /><span className="group-data-[collapsible=icon]:hidden">تسجيل الخروج</span></PendingSubmitButton></form></SidebarFooter><SidebarRail />
  </Sidebar>
}
