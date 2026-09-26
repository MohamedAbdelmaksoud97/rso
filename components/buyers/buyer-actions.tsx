"use client"

import { Edit3Icon, SaveIcon, Trash2Icon } from "lucide-react"
import { deleteApprovedBuyer, updateApprovedBuyer } from "@/app/actions/platform"
import { PendingSubmitButton } from "@/components/pending-submit-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type Buyer = {
  id: number
  full_name: string
  phone: string | null
  national_id: string | null
}

export function BuyerActions({ buyer }: { buyer: Buyer }) {
  const updateAction = updateApprovedBuyer.bind(null, buyer.id)
  const deleteAction = deleteApprovedBuyer.bind(null, buyer.id)

  return (
    <div className="flex items-center gap-1">
      <Dialog>
        <DialogTrigger render={<Button size="sm" variant="ghost" />}>
          <Edit3Icon data-icon="inline-start" />
          تعديل
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات المشتري</DialogTitle>
            <DialogDescription>حدّث البيانات المستخدمة عند اختيار المشتري في سندات الترسية الجديدة.</DialogDescription>
          </DialogHeader>
          <form action={updateAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`buyer-${buyer.id}-name`}>اسم المشتري</FieldLabel>
                <Input id={`buyer-${buyer.id}-name`} name="full_name" required minLength={2} maxLength={120} defaultValue={buyer.full_name} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`buyer-${buyer.id}-phone`}>رقم الجوال</FieldLabel>
                <Input id={`buyer-${buyer.id}-phone`} name="phone" inputMode="tel" dir="ltr" minLength={8} maxLength={20} defaultValue={buyer.phone ?? ""} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`buyer-${buyer.id}-national-id`}>رقم الهوية / السجل</FieldLabel>
                <Input id={`buyer-${buyer.id}-national-id`} name="national_id" inputMode="numeric" dir="ltr" maxLength={40} defaultValue={buyer.national_id ?? ""} />
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-5">
              <DialogClose render={<Button type="button" variant="outline" />}>إلغاء</DialogClose>
              <PendingSubmitButton pendingText="جاري حفظ التعديلات…">
                <SaveIcon data-icon="inline-start" />
                حفظ التعديلات
              </PendingSubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger render={<Button size="sm" variant="destructive" />}>
          <Trash2Icon data-icon="inline-start" />
          حذف
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف المشتري من الدليل؟</DialogTitle>
            <DialogDescription>
              سيُحذف «{buyer.full_name}» من قائمة المشترين المعتمدين ولن يظهر في عمليات الترسية الجديدة. ستظل السندات السابقة محفوظة دون تغيير.
            </DialogDescription>
          </DialogHeader>
          <form action={deleteAction}>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>إلغاء</DialogClose>
              <PendingSubmitButton pendingText="جاري حذف المشتري…" variant="destructive">
                <Trash2Icon data-icon="inline-start" />
                تأكيد الحذف
              </PendingSubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
