"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/server"

const contentSchema = z.object({
  kind: z.enum(["news", "announcement"]),
  title: z.string().trim().min(3).max(140),
  summary: z.string().trim().min(10).max(320),
  body: z.string().trim().min(10).max(10000),
})

async function requireAdmin() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) redirect("/auth/login")
  const { data: profile } = await supabase.from("profiles").select("id,role,approval_status").eq("id", userId).maybeSingle()
  if (!profile || profile.role !== "admin" || profile.approval_status !== "approved") redirect("/dashboard")
  return { supabase, userId }
}

function contentUrl(message: string, type: "error" | "success" = "error", editId?: number) {
  const params = new URLSearchParams({ [type]: message })
  if (editId) params.set("edit", String(editId))
  return `/dashboard/admin/content?${params}`
}

function parseRiyadhDate(value: FormDataEntryValue | null, fallback?: Date) {
  const text = String(value ?? "").trim()
  if (!text) return fallback ?? null
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return null
  const date = new Date(`${text}:00+03:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function readContent(formData: FormData) {
  return contentSchema.safeParse({
    kind: String(formData.get("kind") ?? ""),
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    body: String(formData.get("body") ?? ""),
  })
}

function refreshContent(id?: number) {
  revalidatePath("/")
  revalidatePath("/dashboard/admin/content")
  if (id) revalidatePath(`/news/${id}`)
}

export async function createContentPost(formData: FormData) {
  const { supabase, userId } = await requireAdmin()
  const parsed = readContent(formData)
  if (!parsed.success) redirect(contentUrl("راجع عنوان المحتوى والملخص والتفاصيل، ثم حاول مرة أخرى."))
  const publishAt = parseRiyadhDate(formData.get("publish_at"), new Date())
  const expiresAt = parseRiyadhDate(formData.get("expires_at"))
  if (!publishAt) redirect(contentUrl("أدخل موعد نشر صحيحًا."))
  if (formData.get("expires_at") && !expiresAt) redirect(contentUrl("أدخل موعد انتهاء صحيحًا أو اتركه فارغًا."))
  if (expiresAt && expiresAt <= publishAt) redirect(contentUrl("يجب أن يكون موعد انتهاء الظهور بعد موعد النشر."))

  const { data, error } = await supabase.from("content_posts").insert({
    ...parsed.data,
    is_published: formData.get("is_published") === "on",
    is_featured: formData.get("is_featured") === "on",
    publish_at: publishAt.toISOString(),
    expires_at: expiresAt?.toISOString() ?? null,
    created_by: userId,
    updated_by: userId,
  }).select("id").single()

  if (error || !data) redirect(contentUrl("تعذر حفظ المحتوى الآن. حاول مرة أخرى."))
  await supabase.from("activity_events").insert({ event_type: "content_created", actor_id: userId, entity_type: "content_post", entity_id: String(data.id), summary: "تم إنشاء محتوى عام جديد", metadata: { title: parsed.data.title, kind: parsed.data.kind } })
  refreshContent(data.id)
  redirect(contentUrl("تم حفظ المحتوى، وسيظهر للزوار وفق حالة النشر والموعد المحدد.", "success"))
}

export async function updateContentPost(id: number, formData: FormData) {
  const { supabase, userId } = await requireAdmin()
  if (!Number.isInteger(id) || id <= 0) redirect(contentUrl("تعذر تحديد المحتوى المطلوب تعديله."))
  const parsed = readContent(formData)
  if (!parsed.success) redirect(contentUrl("راجع عنوان المحتوى والملخص والتفاصيل، ثم حاول مرة أخرى.", "error", id))
  const publishAt = parseRiyadhDate(formData.get("publish_at"))
  const expiresAt = parseRiyadhDate(formData.get("expires_at"))
  if (!publishAt) redirect(contentUrl("أدخل موعد نشر صحيحًا.", "error", id))
  if (formData.get("expires_at") && !expiresAt) redirect(contentUrl("أدخل موعد انتهاء صحيحًا أو اتركه فارغًا.", "error", id))
  if (expiresAt && expiresAt <= publishAt) redirect(contentUrl("يجب أن يكون موعد انتهاء الظهور بعد موعد النشر.", "error", id))

  const { data, error } = await supabase.from("content_posts").update({
    ...parsed.data,
    is_published: formData.get("is_published") === "on",
    is_featured: formData.get("is_featured") === "on",
    publish_at: publishAt.toISOString(),
    expires_at: expiresAt?.toISOString() ?? null,
    updated_by: userId,
  }).eq("id", id).select("id").single()

  if (error || !data) redirect(contentUrl("تعذر حفظ التعديلات الآن. حاول مرة أخرى.", "error", id))
  await supabase.from("activity_events").insert({ event_type: "content_updated", actor_id: userId, entity_type: "content_post", entity_id: String(id), summary: "تم تحديث محتوى الصفحة العامة", metadata: { title: parsed.data.title, kind: parsed.data.kind } })
  refreshContent(id)
  redirect(contentUrl("تم حفظ التعديلات وتحديث المحتوى العام.", "success"))
}

export async function setContentPostPublished(id: number, nextPublished: boolean) {
  const { supabase, userId } = await requireAdmin()
  if (!Number.isInteger(id) || id <= 0) redirect(contentUrl("تعذر تحديد المحتوى المطلوب."))
  const { data, error } = await supabase.from("content_posts").update({ is_published: nextPublished, updated_by: userId }).eq("id", id).select("id,title").single()
  if (error || !data) redirect(contentUrl("تعذر تغيير حالة النشر الآن. حاول مرة أخرى."))
  await supabase.from("activity_events").insert({ event_type: nextPublished ? "content_published" : "content_unpublished", actor_id: userId, entity_type: "content_post", entity_id: String(id), summary: nextPublished ? "تم نشر محتوى عام" : "تم إخفاء محتوى عام", metadata: { title: data.title } })
  refreshContent(id)
  redirect(contentUrl(nextPublished ? "تم نشر المحتوى للزوار." : "تم إخفاء المحتوى من الصفحة العامة.", "success"))
}
