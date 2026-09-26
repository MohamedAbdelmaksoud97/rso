# منصة رسو

منظومة عربية لإدارة وتوثيق المزادات في أسواق النفع العام. تغطي رحلة البضاعة من تسجيلها عند البوابة وإصدار QR، مروراً بمسح الدلّال للكود، وحتى إصدار سند الترسية وحساب العمولات.

## الوظائف

- تسجيل الموظفين وتأكيد البريد ثم اعتماد المدير للدور الوظيفي.
- أدوار محمية بسياسات RLS: مدير، دلّال، وبوّاب.
- تسجيل البائع أو الزائر وإصدار بطاقة QR قابلة للطباعة للبضاعة.
- مسح QR من الهاتف وتوثيق المشتري وسعر الترسية.
- دليل مشترين معتمدين مع دعم المشتري الجديد.
- سند ترسية قابل للطباعة والتحقق العام برقم السند أو الجوال.
- عمولات ديناميكية للدلّال والمنصة، وتسويات يومية مجمعة.
- لوحة إشراف لحظية باستخدام Supabase Realtime.
- تحكم المدير في محتوى الصفحة العامة والحقول المنشورة من السند.
- تسجيل الدخول، تأكيد البريد، استعادة كلمة المرور وتغييرها.
- تطبيق PWA قابل للتثبيت مع أيقونات Android وiOS ووضع آمن عند انقطاع الاتصال.

## التشغيل

```bash
npm install
npm run dev
```

انسخ `.env.example` إلى `.env.local` وأدخل بيانات مشروع Supabase.

## تجهيز Supabase

ملفات المخطط موجودة في `supabase/migrations`. ويمكن تطبيقها بحساب CLI مرتبط أو برابط PostgreSQL:

```bash
npx supabase migration up --db-url "$DATABASE_URL" --include-all
```

أو بعد ربط Supabase CLI بالمشروع:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration up --linked
```

أضف `SUPABASE_SERVICE_ROLE_KEY` وبيانات المدير إلى `.env.local`، ثم أنشئ حساب المدير:

```bash
npm run bootstrap:admin
```

لا يُرسل مفتاح `SUPABASE_SERVICE_ROLE_KEY` إلى المتصفح ولا يجب أن يُرفع إلى Git.

## الفحص

```bash
npm run lint
npm run build
npm run verify:platform
npm run verify:auth
npm run verify:pwa
npm run verify:features
```

يتحقق `verify:platform` من الأدوار وRLS والعمولات وQR والسند والبحث العام وRealtime. ويتحقق `verify:auth` من التسجيل والاستعادة وتغيير كلمة المرور، ويفحص `verify:pwa` الـ manifest والأيقونات وService Worker وقابلية التثبيت ووضع offline. ويشغّل `verify:features` دورة واجهة كاملة للأدوار الثلاثة وينظف بياناتها التجريبية تلقائيًا. يجب تشغيل الخادم محليًا قبل اختبارات المتصفح.

لتحديث أيقونات التطبيق بعد تغيير الشعار:

```bash
npm run pwa:icons
```

لالتقاط صور حقيقية من الحسابات وقاعدة البيانات أثناء تشغيل الخادم:

```bash
npm run screenshots
```

تُحفظ الصور في `artifacts/screenshots`. ومسارات `/preview/*` متاحة في وضع التطوير فقط لتصميم الواجهات، ولا تظهر في الإنتاج.
