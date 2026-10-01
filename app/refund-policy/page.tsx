import type { Metadata } from "next"
import { CircleAlertIcon, Clock3Icon, RotateCcwIcon, ScaleIcon } from "lucide-react"
import { PublicLegalPage } from "@/components/legal/public-legal-page"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "سياسة الاسترجاع وإلغاء الصفقات",
  description: "سياسة منصة رسو المنظمة لإلغاء صفقات المزادات والاسترجاع المالي وعدم استبدال السلع المعروضة في الحراج.",
}

export default function RefundPolicyPage() {
  return (
    <PublicLegalPage
      title="سياسة الاسترجاع وإلغاء الصفقات"
      description="توضح هذه السياسة الحالات التي يمكن فيها إلغاء الصفقة أو طلب الاسترجاع، وآلية إعادة المبالغ للصفقات الموثقة عبر منصة رسو."
    >
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3 text-xl"><Badge variant="secondary">١</Badge><h2>طبيعة الخدمة</h2></CardTitle>
          <CardDescription>دور منصة رسو في المزادات والتعاملات الموثقة من خلالها.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-8 text-muted-foreground">
            تُعد منصة رسو منصة تقنية لوساطة وتوثيق المزادات وحوكمة عمليات البيع والشراء في أسواق وحراجات النفع العام والتمور، ولا تعتبر المنصة بائعًا للمنتجات أو مالكة للبضائع المعروضة.
          </p>
        </CardContent>
      </Card>

      <Alert>
        <CircleAlertIcon />
        <AlertTitle>السلع المباعة لا تخضع للاستبدال</AlertTitle>
        <AlertDescription>
          نظرًا إلى طبيعة المنتجات المعروضة في الحراج، ومنها المنتجات الزراعية وسلع النفع العام سريعة التلف، ولأن المزادات تتم بعد معاينة حية ومباشرة في ساحة الحراج، فلا تتوفر خدمة أو خيار الاستبدال عبر المنصة.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3 text-xl"><Badge variant="secondary">٢</Badge><h2>حالات الاسترجاع وإلغاء الصفقة</h2></CardTitle>
          <CardDescription>تُراجع كل حالة وفق وقت تقديم الطلب وحالة السلعة والصفقة.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <section className="flex gap-4">
            <ScaleIcon className="mt-1 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex flex-col gap-2">
              <h3 className="font-bold">الإلغاء قبل الترسية النهائية</h3>
              <p className="leading-8 text-muted-foreground">يحق للمشتري أو البائع إلغاء العرض أو السوم قبل اعتماد الترسية النهائية وإتمام الدفع، دون فرض رسوم.</p>
            </div>
          </section>
          <section className="flex gap-4">
            <RotateCcwIcon className="mt-1 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex flex-col gap-2">
              <h3 className="font-bold">عدم مطابقة السلعة</h3>
              <p className="leading-8 text-muted-foreground">يُنظَر في طلب استرجاع المبلغ أو السلعة عند وجود عيب جوهري أو عدم مطابقة للسلعة التي تمت معاينتها في الساحة، وفق أحكام ولائحة حراج أسواق النفع العام، وبعد اعتماد مدير الحراج أو مسؤول المزاد المعتمد، وقبل خروج السلعة من ساحة المزاد.</p>
            </div>
          </section>
          <section className="flex gap-4">
            <CircleAlertIcon className="mt-1 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex flex-col gap-2">
              <h3 className="font-bold">رسوم الخدمة التقنية</h3>
              <p className="leading-8 text-muted-foreground">تُعد المبالغ المحصلة مقابل الوساطة والخدمة التقنية غير قابلة للاسترجاع بعد تنفيذ الصفقة وتوثيقها بنجاح، ويُستثنى من ذلك وقوع خطأ تقني مثبت في معالجة الدفع المالي.</p>
            </div>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3 text-xl"><Badge variant="secondary">٣</Badge><h2>آلية تنفيذ الاسترجاع المالي</h2></CardTitle>
          <CardDescription>تبدأ مدة المعالجة بعد اعتماد طلب الاسترجاع من إدارة الحراج.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-start gap-4">
          <Clock3Icon className="mt-1 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-base leading-8 text-muted-foreground">
            عند استيفاء شروط الاسترجاع واعتماد الطلب، يُعاد المبلغ إلى الحساب البنكي أو البطاقة التي تم الشراء بها خلال مدة تتراوح بين 3 و7 أيام عمل، بحسب سياسة بوابة الدفع الإلكتروني والبنك المُصدر.
          </p>
        </CardContent>
      </Card>
    </PublicLegalPage>
  )
}
