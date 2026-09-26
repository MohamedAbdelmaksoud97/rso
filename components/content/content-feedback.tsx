"use client"

import { useEffect } from "react"
import { AuthMessage } from "@/components/auth-message"
import { toast } from "@/components/ui/toast"
import { getSafeUserMessage } from "@/lib/user-message"

export function ContentFeedback({ error, success }: { error?: string; success?: string }) {
  const safeError = getSafeUserMessage(error)
  const safeSuccess = getSafeUserMessage(success)

  useEffect(() => {
    if (safeError) toast.add({ title: "تعذر حفظ المحتوى", description: safeError, type: "error" })
    if (safeSuccess) toast.add({ title: "تم تحديث المحتوى", description: safeSuccess, type: "success" })
  }, [safeError, safeSuccess])

  return <AuthMessage error={safeError} success={safeSuccess} />
}
