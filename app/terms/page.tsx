import type { Metadata } from "next"
import { BanknoteIcon, DatabaseIcon, ScaleIcon, UserCheckIcon } from "lucide-react"
import { PublicLegalPage } from "@/components/legal/public-legal-page"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "الشروط والأحكام",
  description: "الشروط والأحكام المنظمة لاستخدام منصة رسو وتوثيق صفقات المزادات الإلكترونية والميدانية.",
}

export default function TermsPage() {
  return (
    <PublicLegalPage
      title="الشروط والأحكام"
      description="تنظم هذه الشروط استخدام منصة رسو وتوثيق صفقات المزادات الإلكترونية والميدانية بين مستخدمي المنصة."
    >
      <Alert>
        <ScaleIcon />
        <AlertTitle>الموافقة على الشروط</AlertTitle>
        <AlertDescription>
          باستخدامك لمنصة رسو، المشغلة بواسطة مؤسسة فهد، فإنك توافق على الالتزام بهذه الشروط والأحكام والضوابط المنظمة للصفقات المنفذة أو الموثقة من خلال المنصة.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3 text-xl"><Badge variant="secondary">١</Badge><h2>المفهوم والنطاق</h2></CardTitle>
          <CardDescription>تنطبق الشروط على المزادات الإلكترونية والميدانية الموثقة في رسو.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-8 text-muted-foreground">
            توفر منصة رسو خدمات تقنية لوساطة المزادات وتوثيق الترسية وحوكمة عمليات البيع والشراء في أسواق النفع العام وحراجات التمور، وفق الإجراءات المعتمدة لدى إدارة السوق والجهات ذات العلاقة.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3 text-xl"><Badge variant="secondary">٢</Badge><h2>أهلية الاستخدام والتسجيل</h2></CardTitle>
          <CardDescription>يلتزم كل مستخدم بتقديم بيانات صحيحة والامتثال للضوابط المنظمة للسوق.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <UserCheckIcon className="mt-1 shrink-0 text-primary" aria-hidden="true" />
          <ul className="flex list-disc flex-col gap-3 ps-5 leading-8 text-muted-foreground">
            <li>يتعهد مستخدم المنصة، سواء كان مسؤول مزاد أو مزارعًا أو مشتريًا، بصحة بيانات الهوية ورقم الجوال وبيانات المنشأة أو السجل التي يقدمها.</li>
            <li>تُعد الصفقات المبرمة عبر المنصة ملزمة لطرفي المزاد فور إتمام الترسية النهائية والسداد.</li>
            <li>يلتزم المستخدم بالأنظمة واللوائح الصادرة عن وزارة البيئة والمياه والزراعة والجهات ذات العلاقة بحوكمة أسواق النفع العام.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3 text-xl"><Badge variant="secondary">٣</Badge><h2>عمليات الدفع والتحصيل</h2></CardTitle>
          <CardDescription>تُعالج المدفوعات الإلكترونية من خلال مزودي خدمات معتمدين.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <BanknoteIcon className="mt-1 shrink-0 text-primary" aria-hidden="true" />
          <ul className="flex list-disc flex-col gap-3 ps-5 leading-8 text-muted-foreground">
            <li>تتم معالجة المبالغ المالية والعمولات عبر بوابات دفع إلكترونية مرخصة من البنك المركزي السعودي.</li>
            <li>لا تتحمل المنصة مسؤولية التعاملات النقدية التي تتم خارج النظام التقني وبوابة الدفع المعتمدة.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3 text-xl"><Badge variant="secondary">٤</Badge><h2>حماية البيانات وحدود المسؤولية</h2></CardTitle>
          <CardDescription>تعالج المنصة البيانات اللازمة للخدمة وتوثيق عمليات السوق.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <DatabaseIcon className="mt-1 shrink-0 text-primary" aria-hidden="true" />
          <ul className="flex list-disc flex-col gap-3 ps-5 leading-8 text-muted-foreground">
            <li>تلتزم المنصة بحماية بيانات المستخدمين وتطبيق أحكام نظام حماية البيانات الشخصية.</li>
            <li>لا تتحمل المنصة مسؤولية جودة أو سلامة المحاصيل الزراعية المعروضة؛ إذ تقع المسؤولية المباشرة عن السلعة على البائع، وتخضع السلعة لمعاينة المشتري في ساحة المزاد.</li>
          </ul>
        </CardContent>
      </Card>
    </PublicLegalPage>
  )
}
