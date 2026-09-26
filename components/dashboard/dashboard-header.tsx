import { RadioIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { RealtimeNotifications } from "@/components/dashboard/realtime-notifications"
import { SidebarTrigger } from "@/components/ui/sidebar"
import type { Profile } from "@/lib/types"

export function DashboardHeader({ profile }: { profile: Profile }) {
  return <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-card px-4 shadow-sm md:px-7" data-dashboard-header data-print-hidden><SidebarTrigger /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">مرحباً، {profile.full_name}</p><p className="text-xs text-muted-foreground">مساحة عمل منصة رسو</p></div>{profile.role === "admin" && <Badge variant="secondary" className="hidden gap-2 sm:flex"><RadioIcon className="animate-pulse" />إشراف مباشر</Badge>}<RealtimeNotifications profile={profile} /></header>
}
