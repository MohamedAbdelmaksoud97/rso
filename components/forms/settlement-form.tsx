"use client"

import { useEffect, useId, useState } from "react"
import { useRouter } from "next/navigation"
import { CameraIcon, FileCheck2Icon, ScanLineIcon } from "lucide-react"
import { createSettlement } from "@/app/actions/platform"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { formatNumber } from "@/lib/constants"
import type { MarketEntry } from "@/lib/types"
import { getSafeUserMessage } from "@/lib/user-message"

type Buyer = { id: number; full_name: string; phone: string | null }

export function SettlementForm({ token = "", buyers, error, entry }: { token?: string; buyers: Buyer[]; error?: string; entry?: MarketEntry | null }) {
  const router = useRouter()
  const scannerId = `qr-reader-${useId().replaceAll(":", "")}`
  const [scanning, setScanning] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [selectedBuyer, setSelectedBuyer] = useState("")
  const buyer = buyers.find((item) => String(item.id) === selectedBuyer)
  const safeError = getSafeUserMessage(error)

  useEffect(() => {
    if (!scanning) return
    let scanner: import("html5-qrcode").Html5Qrcode | undefined
    let cancelled = false
    void import("html5-qrcode").then(({ Html5Qrcode }) => {
      scanner = new Html5Qrcode(scannerId)
      return scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, (decoded) => {
        void scanner?.stop().then(() => router.push(`/dashboard/settlements/new?token=${encodeURIComponent(decoded)}`))
      }, () => undefined)
    }).then(() => { if (!cancelled) setCameraStarting(false) }).catch(() => { if (!cancelled) { setCameraStarting(false); setScanning(false) } })
    return () => { cancelled = true; if (scanner?.isScanning) void scanner.stop() }
  }, [router, scannerId, scanning])

  return <div className="flex flex-col gap-6">{!token && <div className="rounded-2xl border border-dashed p-6 text-center"><ScanLineIcon className="mx-auto size-10 text-primary" /><h2 className="mt-3 font-bold">امسح كود البضاعة</h2><p className="mt-1 text-sm text-muted-foreground">اسمح باستخدام الكاميرا ووجّهها إلى بطاقة QR.</p><Button type="button" className="mt-4" disabled={cameraStarting} aria-busy={cameraStarting} onClick={() => { if (!scanning) setCameraStarting(true); setScanning((value) => !value) }}>{cameraStarting ? <Spinner data-icon="inline-start" /> : <CameraIcon data-icon="inline-start" />}{cameraStarting ? "جاري تشغيل الكاميرا…" : scanning ? "إيقاف الكاميرا" : "فتح الكاميرا"}</Button>{scanning && <div id={scannerId} className="mx-auto mt-5 max-w-sm overflow-hidden rounded-xl" />}</div>}
    <form action="/dashboard/settlements/new" className="flex flex-col gap-2 sm:flex-row"><Input name="token" defaultValue={token} placeholder="أدخل رمز QR يدوياً" dir="ltr" required /><PendingSubmitButton pendingText="جاري تحميل البضاعة…" variant="outline">تحميل البضاعة</PendingSubmitButton></form>
    {safeError && <Alert variant="destructive" role="alert"><AlertDescription>{safeError}</AlertDescription></Alert>}
    {entry && <div className="grid gap-3 rounded-2xl bg-muted p-5 sm:grid-cols-3"><Summary label="المورد" value={entry.person_name ?? "—"} /><Summary label="الصنف" value={entry.commodity_type ?? "—"} /><Summary label="الكمية والوزن" value={`${formatNumber(entry.quantity)} ${entry.unit_label} · ${formatNumber(entry.total_weight_kg)} كجم`} /></div>}
    {token && <form action={createSettlement}><input type="hidden" name="qr_token" value={token} /><FieldGroup><Field><FieldLabel htmlFor="approved_buyer_id">مشتري معتمد (اختياري)</FieldLabel><NativeSelect id="approved_buyer_id" name="approved_buyer_id" value={selectedBuyer} onChange={(event) => setSelectedBuyer(event.target.value)} className="w-full"><NativeSelectOption value="">مشتري جديد</NativeSelectOption>{buyers.map((item) => <NativeSelectOption key={item.id} value={String(item.id)}>{item.full_name}{item.phone ? ` — ${item.phone}` : ""}</NativeSelectOption>)}</NativeSelect><FieldDescription>اختر من القائمة أو أدخل مشترياً جديداً بالأسفل.</FieldDescription></Field><div className="grid gap-5 sm:grid-cols-2"><Field><FieldLabel htmlFor="buyer_name">اسم المستفيد / المشتري</FieldLabel><Input id="buyer_name" name="buyer_name" required defaultValue={buyer?.full_name ?? ""} key={`name-${selectedBuyer}`} /></Field><Field><FieldLabel htmlFor="buyer_phone">رقم جوال المشتري</FieldLabel><Input id="buyer_phone" name="buyer_phone" inputMode="tel" dir="ltr" defaultValue={buyer?.phone ?? ""} key={`phone-${selectedBuyer}`} /></Field><Field><FieldLabel htmlFor="final_price">سعر الترسية النهائي (ر.س)</FieldLabel><Input id="final_price" name="final_price" type="number" min="0.01" step="0.01" required inputMode="decimal" /></Field></div><Field><FieldLabel htmlFor="notes">ملاحظات الصفقة</FieldLabel><Textarea id="notes" name="notes" rows={3} /></Field><Field><PendingSubmitButton pendingText="جاري إصدار السند…" size="lg" className="w-full sm:w-auto"><FileCheck2Icon data-icon="inline-start" />إصدار وتوثيق السند</PendingSubmitButton></Field></FieldGroup></form>}
  </div>
}

function Summary({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div> }
