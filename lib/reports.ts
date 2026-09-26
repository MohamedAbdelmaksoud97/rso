import { createClient } from "@/lib/server"
import type { AdminReportData } from "@/lib/types"

export async function getAdminReport(startDate: string, endDate: string): Promise<AdminReportData> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_admin_report", {
    p_start_date: startDate,
    p_end_date: endDate,
  })

  if (error) throw new Error(error.message)
  return data as AdminReportData
}
