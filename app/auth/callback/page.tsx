"use client"

import { useEffect, useState } from "react"
import type { EmailOtpType } from "@supabase/supabase-js"
import { ShieldCheckIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { BrandLogo } from "@/components/brand-logo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { createClient } from "@/lib/client"

export default function AuthCallbackPage() {
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    const completeAuthentication = async () => {
      const url = new URL(window.location.href)
      const nextValue = url.searchParams.get("next")
      const next = nextValue?.startsWith("/") && !nextValue.startsWith("//") ? nextValue : "/dashboard"
      const supabase = createClient()
      const code = url.searchParams.get("code")
      const tokenHash = url.searchParams.get("token_hash")
      const type = url.searchParams.get("type") as EmailOtpType | null
      const hash = new URLSearchParams(url.hash.slice(1))
      const accessToken = hash.get("access_token")
      const refreshToken = hash.get("refresh_token")

      let authError: Error | null = null
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        authError = error
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        authError = error
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        authError = error
      } else {
        authError = new Error("Missing authentication parameters")
      }

      if (!active) return
      if (authError) {
        window.history.replaceState(null, "", "/auth/callback")
        setError(true)
        return
      }
      window.location.replace(next)
    }

    void completeAuthentication()
    return () => { active = false }
  }, [])

  return <main className="rso-grid flex min-h-screen items-center justify-center px-5 py-12"><Card className="w-full max-w-md text-center shadow-xl"><CardHeader><BrandLogo compact className="mx-auto mb-6" /><div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-secondary/35 text-primary"><ShieldCheckIcon /></div><CardTitle>{error ? "تعذر تأكيد الرابط" : "جاري تأكيد الحساب"}</CardTitle></CardHeader><CardContent>{error ? <Alert variant="destructive"><AlertTitle>الرابط غير صالح</AlertTitle><AlertDescription>انتهت صلاحية الرابط أو تم استخدامه من قبل. اطلب رابطًا جديدًا ثم حاول مرة أخرى.</AlertDescription></Alert> : <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground"><Spinner />لحظات ويتم تحويلك تلقائيًا…</div>}</CardContent></Card></main>
}
