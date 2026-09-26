"use client"

import { useEffect, useRef, useState } from "react"
import { ActivityIcon, BellIcon, RadioIcon } from "lucide-react"
import { createClient } from "@/lib/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import type { Profile } from "@/lib/types"

type NotificationItem = {
  id: number
  summary: string
  event_type: string
  created_at: string
}

export function RealtimeNotifications({ profile }: { profile: Profile }) {
  const [events, setEvents] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [connected, setConnected] = useState(false)
  const knownIds = useRef(new Set<number>())
  const initialized = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | undefined
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let disposed = false

    const merge = (incoming: NotificationItem[], current: NotificationItem[]) => {
      const unique = new Map([...incoming, ...current].map((item) => [item.id, item]))
      return [...unique.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 12)
    }

    const syncLatest = async () => {
      const { data } = await supabase
        .from("activity_events")
        .select("id,summary,event_type,created_at")
        .order("created_at", { ascending: false })
        .limit(12)
      if (disposed || !data) return
      const incoming = data as NotificationItem[]
      const unseen = initialized.current ? incoming.filter((item) => !knownIds.current.has(item.id)) : []
      incoming.forEach((item) => knownIds.current.add(item.id))
      setEvents((current) => merge(incoming, current))
      if (unseen.length > 0) {
        setUnread((current) => current + unseen.length)
        toast.add({
          title: unseen.length === 1 ? "إشعار جديد" : `${unseen.length} إشعارات جديدة`,
          description: unseen[0].summary,
          type: "info",
        })
      }
      initialized.current = true
    }

    const connect = async () => {
      await supabase.realtime.setAuth()
      if (disposed) return
      channel = supabase
        .channel(`notifications-${profile.id}-${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, (payload) => {
          const incoming = payload.new as NotificationItem
          if (knownIds.current.has(incoming.id)) return
          knownIds.current.add(incoming.id)
          setEvents((current) => merge([incoming], current))
          setUnread((current) => current + 1)
          toast.add({ title: "إشعار جديد", description: incoming.summary, type: "info" })
        })
        .subscribe(async (status) => {
          if (disposed) return
          setConnected(status === "SUBSCRIBED")
          if (status === "SUBSCRIBED") await syncLatest()
          if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status) && !reconnectTimer) {
            reconnectTimer = setTimeout(async () => {
              reconnectTimer = undefined
              if (channel) await supabase.removeChannel(channel)
              if (!disposed) void connect()
            }, 2000)
          }
        })
    }

    void connect()
    const syncTimer = setInterval(() => void syncLatest(), 5000)
    return () => {
      disposed = true
      clearInterval(syncTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [profile.id])

  return <Dialog>
    <DialogTrigger render={<Button size="icon" variant="ghost" className="relative" aria-label={unread ? `الإشعارات، ${unread} غير مقروءة` : "الإشعارات"} />} onClick={() => setUnread(0)}>
      <BellIcon />
      {unread > 0 && <span className="absolute end-0 top-0 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white" aria-hidden="true">{unread > 9 ? "+9" : unread}</span>}
    </DialogTrigger>
    <DialogContent dir="rtl" className="max-h-[min(80vh,42rem)] overflow-hidden sm:max-w-lg">
      <DialogHeader className="ps-9">
        <div className="flex items-center justify-between gap-3">
          <DialogTitle className="text-lg">الإشعارات</DialogTitle>
          <Badge variant={connected ? "default" : "secondary"}><RadioIcon className={connected ? "animate-pulse" : ""} />{connected ? "متصل لحظيًا" : "جاري الاتصال"}</Badge>
        </div>
        <DialogDescription>{profile.role === "admin" ? "آخر العمليات المسجلة داخل السوق." : "آخر العمليات التي نفذتها على المنصة."}</DialogDescription>
      </DialogHeader>
      <div className="-mx-1 flex max-h-[55vh] flex-col gap-2 overflow-y-auto px-1" aria-live="polite">
        {events.length === 0 ? <div className="rounded-xl border border-dashed px-4 py-10 text-center"><BellIcon className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold">لا توجد إشعارات جديدة</p><p className="mt-1 text-sm text-muted-foreground">ستظهر العمليات هنا فور تسجيلها.</p></div> : events.map((event) => <article key={event.id} className="flex items-start gap-3 rounded-xl border p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ActivityIcon className="size-4" /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-6">{event.summary}</p><time className="text-xs text-muted-foreground" dateTime={event.created_at}>{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.created_at))}</time></div>
        </article>)}
      </div>
    </DialogContent>
  </Dialog>
}
