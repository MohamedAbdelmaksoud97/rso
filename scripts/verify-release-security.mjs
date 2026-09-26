import { execFileSync } from "node:child_process"
import { readFile, readdir } from "node:fs/promises"
import { join, resolve } from "node:path"

const baseUrl = "http://localhost:3000"
const env = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=")
      return [line.slice(0, separator), line.slice(separator + 1)]
    }),
)

const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "RSO_ADMIN_EMAIL",
  "RSO_ADMIN_PASSWORD",
  "RSO_GATEKEEPER_EMAIL",
  "RSO_GATEKEEPER_PASSWORD",
  "RSO_AUCTIONEER_EMAIL",
  "RSO_AUCTIONEER_PASSWORD",
]
const sensitiveKeys = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "RSO_ADMIN_PASSWORD",
  "RSO_GATEKEEPER_PASSWORD",
  "RSO_AUCTIONEER_PASSWORD",
]
const checks = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean)
}

async function readTextIfPossible(path) {
  const content = await readFile(path)
  if (content.includes(0)) return null
  return content.toString("utf8")
}

async function listFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listFiles(path))
    else files.push(path)
  }
  return files
}

for (const key of requiredKeys) assert(env[key]?.trim(), `متغير البيئة ${key} غير موجود أو فارغ`)
checks.push("required-environment-variables")

const supabaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL)
assert(supabaseUrl.protocol === "https:" && supabaseUrl.hostname.endsWith(".supabase.co"), "رابط Supabase غير صالح للإطلاق")
assert(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_"), "المفتاح العام لا يستخدم الصيغة الحالية")
assert(env.SUPABASE_SERVICE_ROLE_KEY.startsWith(["sb", "secret", ""].join("_")), "مفتاح الخادم لا يستخدم الصيغة الحالية")
checks.push("supabase-environment-shape")

const emails = [env.RSO_ADMIN_EMAIL, env.RSO_GATEKEEPER_EMAIL, env.RSO_AUCTIONEER_EMAIL]
const passwords = [env.RSO_ADMIN_PASSWORD, env.RSO_GATEKEEPER_PASSWORD, env.RSO_AUCTIONEER_PASSWORD]
assert(new Set(emails).size === emails.length, "حسابات الأدوار الثلاثة تستخدم البريد نفسه")
assert(new Set(passwords).size === passwords.length, "حسابات الأدوار الثلاثة تستخدم كلمة المرور نفسها")
assert(passwords.every((password) => password.length >= 12), "إحدى كلمات مرور حسابات التشغيل أقصر من 12 حرفًا")
checks.push("role-account-separation")

const ignoredEnv = execFileSync("git", ["check-ignore", ".env.local"], { encoding: "utf8" }).trim()
assert(ignoredEnv === ".env.local", "ملف .env.local غير مستبعد من Git")
assert(!trackedFiles().some((path) => /^\.env(?:\.|$)/.test(path)), "يوجد ملف بيئة محفوظ داخل Git")
checks.push("environment-files-ignored")

const secrets = sensitiveKeys.map((key) => ({ key, value: env[key] })).filter(({ value }) => value.length >= 8)
for (const path of trackedFiles()) {
  const text = await readTextIfPossible(resolve(path))
  if (!text) continue
  for (const { key, value } of secrets) assert(!text.includes(value), `قيمة ${key} موجودة داخل الملف المتتبع ${path}`)
}
checks.push("tracked-files-secret-scan")

for (const { key, value } of secrets) {
  const history = execFileSync("git", ["log", "--all", "--format=%H", "-S", value], { encoding: "utf8" }).trim()
  assert(!history, `قيمة ${key} الحالية ظهرت في تاريخ Git ويجب تدويرها قبل الإطلاق`)
}
checks.push("git-history-current-secret-scan")

const clientFiles = await listFiles(resolve(".next/static"))
for (const path of clientFiles) {
  const text = await readTextIfPossible(path)
  if (!text) continue
  for (const { key, value } of secrets) assert(!text.includes(value), `قيمة ${key} تسرّبت إلى حزمة المتصفح`)
}
checks.push("client-bundle-secret-scan")

const response = await fetch(baseUrl, { redirect: "manual" })
assert(response.ok, `الصفحة الرئيسية لم تستجب بنجاح: ${response.status}`)
const expectedHeaders = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(self), microphone=(), geolocation=(), browsing-topics=()",
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
}
for (const [key, value] of Object.entries(expectedHeaders)) {
  assert(response.headers.get(key) === value, `ترويسة الحماية ${key} غير موجودة أو غير صحيحة`)
}
checks.push("http-security-headers")

console.log(JSON.stringify({ ok: true, checks }, null, 2))
