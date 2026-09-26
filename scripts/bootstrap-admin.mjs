import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

const envFile = readFileSync(".env.local", "utf8")
const localEnv = Object.fromEntries(
  envFile
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=")
      return [line.slice(0, separator), line.slice(separator + 1)]
    }),
)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? localEnv.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.RSO_ADMIN_EMAIL ?? localEnv.RSO_ADMIN_EMAIL ?? "admin@rsu.sa"
const password = process.env.RSO_ADMIN_PASSWORD ?? localEnv.RSO_ADMIN_PASSWORD

if (!url || !serviceKey || !password) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or RSO_ADMIN_PASSWORD.")
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "مدير منصة رسو" },
})

if (error && !error.message.toLowerCase().includes("already")) {
  console.error(error.message)
  process.exit(1)
}

let userId = data?.user?.id
if (!userId) {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) throw listError
  userId = users.users.find((user) => user.email === email)?.id
}

if (!userId) throw new Error("Could not resolve the admin user.")

const { error: profileError } = await supabase
  .from("profiles")
  .update({
    role: "admin",
    approval_status: "approved",
    approved_by: userId,
    approved_at: new Date().toISOString(),
  })
  .eq("id", userId)

if (profileError) throw profileError
console.log(`Admin account is ready: ${email}`)
