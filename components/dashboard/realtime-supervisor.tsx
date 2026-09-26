"use client"

import { useEffect, useState } from "react"
import { ActivityIcon, RadioIcon } from "lucide-react"
import { createClient } from "@/lib/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type EventItem = { id: number; summary: string; created_at: string; event_type: string }

export function RealtimeSupervisor({ initialEvents }: { initialEvents: EventItem[] }) {
  const [events, setEvents] = useState(initialEvents)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | undefined
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let disposed = false

    const mergeEvents = (incoming: EventItem[], current: EventItem[]) => {
      const unique = new Map([...incoming, ...current].map((event) => [event.id, event]))
      return [...unique.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 8)
    }

    const syncLatest = async () => {
      const { data } = await supabase.from("activity_events").select("id,summary,created_at,event_type").order("created_at", { ascending: false }).limit(8)
      if (!disposed && data) setEvents((current) => mergeEvents(data as EventItem[], current))
    }

    const connect = async () => {
      await supabase.realtime.setAuth()
      if (disposed) return
      channel = supabase
        .channel(`admin-supervisor-${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, (payload) => {
          setEvents((current) => mergeEvents([payload.new as EventItem], current))
        })
        .subscribe(async (status) => {
          if (disposed) return
          setConnected(status === "SUBSCRIBED")
          if (status === "SUBSCRIBED") {
            await syncLatest()
          }
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
    const syncTimer = setInterval(() => void syncLatest(), 4000)
    return () => {
      disposed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      clearInterval(syncTimer)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [])

  return <Card><CardHeader><div className="flex items-center justify-between gap-4"><div><CardTitle>المشرف اللحظي</CardTitle><CardDescription>آخر العمليات المسجلة داخل السوق</CardDescription></div><Badge variant={connected ? "default" : "secondary"}><RadioIcon />{connected ? "متصل" : "جاري الاتصال"}</Badge></div></CardHeader><CardContent className="flex flex-col gap-3">{events.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">ستظهر العمليات الجديدة هنا فور حدوثها.</p> : events.map((event) => <div key={event.id} className="flex items-center gap-3 rounded-xl border p-3"><div className="flex size-9 items-center justify-center rounded-lg bg-muted"><ActivityIcon /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{event.summary}</p><p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("ar-SA", { timeStyle: "short" }).format(new Date(event.created_at))}</p></div></div>)}</CardContent></Card>
}
