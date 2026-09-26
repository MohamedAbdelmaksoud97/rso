"use client"

import { PrinterIcon } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"

export function QrCard({ value }: { value: string }) {
  return <div className="flex flex-col items-center gap-5"><div className="rounded-3xl border-8 border-background bg-white p-5 shadow-sm"><QRCodeSVG value={value} size={210} level="H" imageSettings={{ src: "/favicon.ico", width: 32, height: 32, excavate: true }} /></div><Button type="button" onClick={() => window.print()} variant="outline" data-print-hidden><PrinterIcon data-icon="inline-start" />طباعة بطاقة البضاعة</Button></div>
}
