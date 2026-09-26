import { redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/queries"
import type { AppRole } from "@/lib/types"

export async function requireAdminPage() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "admin" || profile.approval_status !== "approved") redirect("/dashboard")
  return profile
}

export async function requireRolePage(roles: AppRole[]) {
  const profile = await getCurrentProfile()
  if (!profile || !profile.role || profile.approval_status !== "approved" || !roles.includes(profile.role)) redirect("/dashboard")
  return profile
}
