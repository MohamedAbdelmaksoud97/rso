import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getSafeUserMessage } from "@/lib/user-message"

export function AuthMessage({ error, success }: { error?: string; success?: string }) {
  const safeError = getSafeUserMessage(error)
  const safeSuccess = getSafeUserMessage(success)
  if (!safeError && !safeSuccess) return null
  return <Alert variant={safeError ? "destructive" : "default"} className="mb-5" role={safeError ? "alert" : "status"} aria-live="polite"><AlertTitle>{safeError ? "تعذر إكمال الطلب" : "تمت العملية بنجاح"}</AlertTitle><AlertDescription>{safeError ?? safeSuccess}</AlertDescription></Alert>
}
