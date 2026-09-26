"use client"

import { useState } from "react"
import { ClipboardPlusIcon } from "lucide-react"
import { createMarketEntry } from "@/app/actions/platform"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { commodityTypes } from "@/lib/constants"
import { getSafeUserMessage } from "@/lib/user-message"

export function EntryForm({ error }: { error?: string }) {
  const [kind, setKind] = useState<"seller" | "visitor">("seller")
  const safeError = getSafeUserMessage(error)
  return <form action={createMarketEntry}><FieldGroup>
    {safeError && <Alert variant="destructive" role="alert"><AlertDescription>{safeError}</AlertDescription></Alert>}
    <div className="grid gap-5 sm:grid-cols-2">
      <Field><FieldLabel htmlFor="entry_kind">نوع الزائر</FieldLabel><NativeSelect id="entry_kind" name="entry_kind" value={kind} onChange={(event) => setKind(event.target.value as "seller" | "visitor")} className="w-full"><NativeSelectOption value="seller">بائع / مورد</NativeSelectOption><NativeSelectOption value="visitor">زائر</NativeSelectOption></NativeSelect></Field>
      <Field><FieldLabel htmlFor="person_name">{kind === "seller" ? "اسم المورد / المزارع" : "اسم الزائر (اختياري)"}</FieldLabel><Input id="person_name" name="person_name" required={kind === "seller"} minLength={2} placeholder={kind === "seller" ? "الاسم الثلاثي" : "يمكن تركه فارغاً"} /></Field>
      <Field><FieldLabel htmlFor="mobile_or_id">{kind === "seller" ? "رقم الجوال / الهوية" : "رقم الجوال / الهوية (اختياري)"}</FieldLabel><Input id="mobile_or_id" name="mobile_or_id" required={kind === "seller"} minLength={6} inputMode="numeric" dir="ltr" placeholder={kind === "visitor" ? "يمكن تركه فارغاً" : undefined} /><FieldDescription>{kind === "seller" ? "يُستخدم لاحقاً للبحث والتحقق." : "يكفي اختيار نوع الدخول زائر لتسجيله ضمن إحصاءات اليوم."}</FieldDescription></Field>
      {kind === "seller" && <><Field><FieldLabel htmlFor="commodity_type">نوع / صنف السلعة</FieldLabel><NativeSelect id="commodity_type" name="commodity_type" required className="w-full"><NativeSelectOption value="">اختر الصنف</NativeSelectOption>{commodityTypes.map((type) => <NativeSelectOption key={type} value={type}>{type}</NativeSelectOption>)}</NativeSelect></Field><Field><FieldLabel htmlFor="quantity">الكمية / عدد الوحدات</FieldLabel><Input id="quantity" name="quantity" type="number" min="0.01" step="0.01" required inputMode="decimal" /></Field><Field><FieldLabel htmlFor="unit_label">وحدة القياس</FieldLabel><NativeSelect id="unit_label" name="unit_label" className="w-full"><NativeSelectOption value="وحدة">وحدة</NativeSelectOption><NativeSelectOption value="كرتون">كرتون</NativeSelectOption><NativeSelectOption value="عبوة">عبوة</NativeSelectOption><NativeSelectOption value="صندوق">صندوق</NativeSelectOption></NativeSelect></Field><Field><FieldLabel htmlFor="total_weight_kg">الوزن الإجمالي بالكيلوجرام</FieldLabel><Input id="total_weight_kg" name="total_weight_kg" type="number" min="0.01" step="0.01" required inputMode="decimal" /></Field></>}
    </div>
    <Field><FieldLabel htmlFor="notes">ملاحظات</FieldLabel><Textarea id="notes" name="notes" rows={3} placeholder="أي ملاحظات خاصة بالدخول أو البضاعة" /></Field>
    <Field><PendingSubmitButton pendingText="جاري تسجيل الدخول…" size="lg" className="w-full sm:w-auto"><ClipboardPlusIcon data-icon="inline-start" />{kind === "seller" ? "تسجيل وإصدار QR" : "تسجيل دخول الزائر"}</PendingSubmitButton></Field>
  </FieldGroup></form>
}
