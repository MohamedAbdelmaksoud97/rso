const technicalTerms = /sql|postgres|supabase|pgrst|constraint|duplicate key|schema|table|column|function|jwt|uuid|stack|syntax|permission denied|row.level|قاعدة البيانات|استثناء|خطأ تقني/i

const fallbackMessage = "تعذر إكمال الطلب الآن. حاول مرة أخرى، وإذا استمرت المشكلة فتواصل مع مدير المنصة."

export function getSafeUserMessage(message?: string) {
  const value = message?.trim()
  if (!value) return undefined
  if (value.length > 240 || technicalTerms.test(value)) return fallbackMessage
  return value
}
