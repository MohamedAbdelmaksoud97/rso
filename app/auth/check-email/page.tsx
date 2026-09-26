import Link from "next/link"
import { MailCheckIcon } from "lucide-react"
import { AuthMessage } from "@/components/auth-message"
import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const messages = await searchParams
  return <AuthShell title="راجع بريدك الإلكتروني" description="افتح الرسالة المرسلة من منصة رسو واضغط رابط التأكيد لإكمال العملية."><AuthMessage {...messages} /><div className="flex flex-col items-center gap-5 py-5 text-center"><div className="flex size-20 items-center justify-center rounded-full bg-secondary/40"><MailCheckIcon className="size-9 text-primary" /></div><p className="leading-8 text-muted-foreground">قد تستغرق الرسالة دقيقة أو دقيقتين. راجع مجلد الرسائل غير المرغوب فيها إذا لم تظهر.</p><Button render={<Link href="/auth/login" />} nativeButton={false} variant="outline" className="w-full">العودة لتسجيل الدخول</Button></div></AuthShell>
}
