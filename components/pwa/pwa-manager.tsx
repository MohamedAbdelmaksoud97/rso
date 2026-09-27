"use client"

import { useEffect, useState } from "react"
import { DownloadIcon, Share2Icon, WifiOffIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function PwaManager() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSHelp, setShowIOSHelp] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return

    const initializeTimer = window.setTimeout(() => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
      setIsStandalone(standalone)
      setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))
      setIsOffline(!navigator.onLine)
    }, 0)

    const hadController = Boolean(navigator.serviceWorker?.controller)
    let reloadingForUpdate = false
    const handleControllerChange = () => {
      if (!hadController || reloadingForUpdate) return
      reloadingForUpdate = true
      window.location.reload()
    }
    navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange)

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker?.register("/sw.js", { scope: "/", updateViaCache: "none" })
        if (!registration) return
        await registration.update()
        registration.waiting?.postMessage({ type: "SKIP_WAITING" })
      } catch {
        // The web application remains fully usable when PWA registration is unavailable.
      }
    }
    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstallPrompt(null)
      setIsStandalone(true)
    }
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener("beforeinstallprompt", handleInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.clearTimeout(initializeTimer)
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange)
    }
  }, [])

  async function install() {
    if (!installPrompt) {
      setShowIOSHelp(true)
      return
    }
    setIsInstalling(true)
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === "accepted") setInstallPrompt(null)
    } finally {
      setIsInstalling(false)
    }
  }

  return <>
    {isOffline && <div role="status" className="fixed inset-x-4 top-4 z-[100] mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background shadow-xl"><WifiOffIcon className="size-4" />أنت تعمل دون اتصال. بعض العمليات تحتاج إلى الشبكة.</div>}
    {!isStandalone && (installPrompt || isIOS) && <div className="fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-start gap-2" data-print-hidden>
      {showIOSHelp && <div className="relative max-w-xs rounded-2xl border bg-card p-4 pe-10 text-sm leading-7 shadow-xl"><Button type="button" variant="ghost" size="icon-sm" className="absolute left-1 top-1" onClick={() => setShowIOSHelp(false)} aria-label="إغلاق"><XIcon /></Button><p className="font-bold">تثبيت رسو على iPhone</p><p className="text-muted-foreground">اضغط زر المشاركة <Share2Icon className="inline size-4" /> ثم اختر «إضافة إلى الشاشة الرئيسية».</p></div>}
      <Button type="button" onClick={install} disabled={isInstalling} aria-busy={isInstalling} className="shadow-xl">{isInstalling ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}{isInstalling ? "جاري فتح التثبيت…" : "تثبيت تطبيق رسو"}</Button>
    </div>}
  </>
}
