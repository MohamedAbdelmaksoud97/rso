import Link from "next/link"
import { ArrowLeftIcon, FileCheck2Icon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/constants"
import { createClient } from "@/lib/server"
import type { Settlement } from "@/lib/types"

export default async function ReceiptsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("auction_settlements").select("id,receipt_number,buyer_name,buyer_phone,final_price,auctioneer_commission,platform_commission,settled_at,market_entries(person_name,commodity_type,quantity,unit_label,total_weight_kg)").order("settled_at", { ascending: false }).limit(100)
  const settlements = (data ?? []) as unknown as Settlement[]
  return <div className="mx-auto max-w-7xl"><div className="mb-7"><Badge variant="secondary"><FileCheck2Icon />السجل المالي</Badge><h1 className="mt-3 text-3xl font-black">السندات والصفقات</h1><p className="mt-2 text-muted-foreground">سجل الترسية الموثق والقابل للطباعة والتحقق.</p></div><Card><CardHeader><CardTitle>آخر السندات</CardTitle><CardDescription>حتى 100 سند وفق صلاحيات حسابك.</CardDescription></CardHeader><CardContent>{settlements.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><FileCheck2Icon /></EmptyMedia><EmptyTitle>لا توجد سندات حتى الآن</EmptyTitle><EmptyDescription>تظهر هنا الصفقات بعد توثيقها بواسطة الدلّال.</EmptyDescription></EmptyHeader></Empty> : <Table><TableHeader><TableRow><TableHead>السند</TableHead><TableHead>المورد</TableHead><TableHead>المشتري</TableHead><TableHead>السعر</TableHead><TableHead>التاريخ</TableHead><TableHead /></TableRow></TableHeader><TableBody>{settlements.map((item) => <TableRow key={item.id}><TableCell dir="ltr" className="font-bold">{item.receipt_number}</TableCell><TableCell>{item.market_entries?.person_name ?? "—"}</TableCell><TableCell>{item.buyer_name}</TableCell><TableCell>{formatCurrency(item.final_price)}</TableCell><TableCell>{formatDate(item.settled_at)}</TableCell><TableCell><Button render={<Link href={`/dashboard/receipts/${item.receipt_number}`} />} nativeButton={false} size="sm" variant="ghost">عرض<ArrowLeftIcon data-icon="inline-end" /></Button></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card></div>
}
