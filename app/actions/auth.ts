"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"

function messageUrl(path: string, type: "error" | "success", message: string) {
  return `${path}?${type}=${encodeURIComponent(message)}`
}

type AuthOperation = "register" | "recovery"
type SafeAuthError = { code?: string; message: string; status?: number }

function authErrorMessage(operation: AuthOperation, error: SafeAuthError) {
  const code = error.code ?? "unknown"
  console.warn(`auth.${operation}.failed`, { code, status: error.status ?? null })

  if (code === "over_email_send_rate_limit") {
    return operation === "register"
      ? "تم طلب رابط تفعيل لهذا البريد قبل وقت قصير. راجع صندوق الوارد والرسائل غير المرغوبة، أو انتظر دقيقة ثم حاول مرة أخرى."
      : "تم طلب رابط استعادة لهذا البريد قبل وقت قصير. راجع صندوق الوارد والرسائل غير المرغوبة، أو انتظر دقيقة ثم حاول مرة أخرى."
  }
  if (code === "over_request_rate_limit" || /too many requests/i.test(error.message)) {
    return "تمت محاولات كثيرة خلال وقت قصير. انتظر بضع دقائق ثم حاول مرة أخرى."
  }
  if (code === "email_address_not_authorized") {
    return "لا يستطيع نظام البريد الحالي الإرسال إلى هذا العنوان. تواصل مع مدير المنصة لتفعيل خدمة البريد الخارجي."
  }
  if (code === "email_address_invalid") return "تأكد من كتابة بريد إلكتروني صحيح ثم حاول مرة أخرى."
  if (code === "weak_password") return "اختر كلمة مرور أقوى تتكون من 8 أحرف على الأقل وتجمع بين الحروف والأرقام."

  return operation === "register"
    ? "تعذر إنشاء طلب الحساب. راجع البيانات أو حاول مرة أخرى."
    : "تعذر إرسال رابط الاستعادة. حاول مرة أخرى."
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(messageUrl("/auth/login", "error", "تحقق من البريد وكلمة المرور ومن تفعيل بريدك الإلكتروني، ثم حاول مرة أخرى."))
  redirect("/dashboard")
}

export async function register(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const requestHeaders = await headers()
  const origin = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

  if (fullName.length < 2 || password.length < 8) {
    redirect(messageUrl("/auth/register", "error", "راجع الاسم، ويجب ألا تقل كلمة المرور عن 8 أحرف."))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      data: { full_name: fullName, phone },
    },
  })
  if (error) redirect(messageUrl("/auth/register", "error", authErrorMessage("register", error)))
  redirect(messageUrl("/auth/check-email", "success", "أرسلنا رابط تفعيل الحساب إلى بريدك الإلكتروني."))
}

export async function forgotPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const requestHeaders = await headers()
  const origin = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
  })
  if (error) redirect(messageUrl("/auth/forgot-password", "error", authErrorMessage("recovery", error)))
  redirect(messageUrl("/auth/check-email", "success", "إذا كان البريد مسجلاً فسيصلك رابط استعادة كلمة المرور."))
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirm_password") ?? "")
  if (password.length < 8 || password !== confirmPassword) {
    redirect(messageUrl("/auth/update-password", "error", "تأكد من تطابق كلمتي المرور، وأن تتكون كل منهما من 8 أحرف على الأقل."))
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect(messageUrl("/auth/update-password", "error", "انتهت صلاحية الرابط. اطلب رابطاً جديداً."))
  await supabase.auth.signOut()
  redirect(messageUrl("/auth/login", "success", "تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن."))
}

export async function changePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirm_password") ?? "")
  if (password.length < 8 || password !== confirmPassword) {
    redirect(messageUrl("/dashboard/account", "error", "تأكد من تطابق كلمتي المرور، وأن تتكون كل منهما من 8 أحرف على الأقل."))
  }
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect("/auth/login")
  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect(messageUrl("/dashboard/account", "error", "تعذر تغيير كلمة المرور. حاول مرة أخرى."))
  await supabase.auth.signOut()
  redirect(messageUrl("/auth/login", "success", "تم تغيير كلمة المرور وتسجيل خروج الجلسة القديمة."))
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
