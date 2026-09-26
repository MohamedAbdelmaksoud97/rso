import { spawn } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import process from "node:process"

const root = process.cwd()
const artifacts = resolve(root, "artifacts")
const logDirectory = resolve(artifacts, "release-logs")
const reportPath = resolve(artifacts, "production-readiness-report.md")
const nextBin = resolve(root, "node_modules/next/dist/bin/next")
const eslintBin = resolve(root, "node_modules/eslint/bin/eslint.js")
const results = []
let server

const suites = [
  ["أمان الأسرار وإعدادات الإنتاج", "verify-release-security.mjs"],
  ["Supabase وقاعدة البيانات والصلاحيات", "verify-platform.mjs"],
  ["التسجيل والتفعيل واستعادة كلمة المرور", "verify-auth-flows.mjs"],
  ["دورة المنصة الكاملة والأدوار الثلاثة", "verify-all-features.mjs"],
  ["إدخال صنف السلعة يدويًا", "verify-custom-commodity.mjs"],
  ["إدارة المشترين المعتمدين", "verify-approved-buyers-crud.mjs"],
  ["الزوار وتقارير الحضور", "verify-visitor-reporting.mjs"],
  ["إعدادات الصفحة العامة والتحديث اللحظي", "verify-site-settings.mjs"],
  ["تقارير المدير وCSV وPDF", "verify-admin-reports.mjs"],
  ["الإشعارات اللحظية", "verify-realtime-notifications.mjs"],
  ["الأخبار والإعلانات", "verify-content-management.mjs"],
  ["مؤشرات البائعين والزوار", "verify-dashboard-seller-entries.mjs"],
  ["طباعة سند الترسية", "verify-receipt-print.mjs"],
  ["PWA والتثبيت والعمل دون اتصال", "verify-pwa.mjs"],
  ["Accessibility للأدوار والواجهات", "verify-accessibility.mjs"],
  ["UX والاستجابة والأداء", "verify-ux-quality.mjs"],
  ["تفاصيل التخطيط والمسافات", "verify-layout-polish.mjs"],
]

function sanitizeFileName(value) {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()
}

async function runProcess(name, args, options = {}) {
  const startedAt = Date.now()
  let output = ""
  const logName = options.logName ?? sanitizeFileName(name)
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, NODE_ENV: options.nodeEnv ?? process.env.NODE_ENV },
    windowsHide: true,
  })
  const timeout = setTimeout(() => child.kill("SIGTERM"), options.timeout ?? 300_000)

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString()
    output += text
    process.stdout.write(text)
  })
  child.stderr.on("data", (chunk) => {
    const text = chunk.toString()
    output += text
    process.stderr.write(text)
  })

  const exitCode = await new Promise((resolveCode, reject) => {
    child.on("error", reject)
    child.on("close", resolveCode)
  })
  clearTimeout(timeout)
  const durationMs = Date.now() - startedAt
  await writeFile(resolve(logDirectory, `${logName}.log`), output, "utf8")
  return { name, ok: exitCode === 0, exitCode, durationMs, output }
}

async function waitForServer() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`توقف خادم الإنتاج مبكرًا برمز ${server.exitCode}`)
    try {
      const response = await fetch("http://localhost:3000", { redirect: "manual" })
      if (response.status > 0) return
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 400))
  }
  throw new Error("لم يصبح خادم الإنتاج جاهزًا خلال 30 ثانية")
}

function formatDuration(durationMs) {
  return `${(durationMs / 1000).toFixed(1)} ثانية`
}

function failureSummary(output) {
  return output.trim().split(/\r?\n/).slice(-12).join("\n")
}

async function writeReport() {
  const passed = results.filter((result) => result.ok).length
  const failed = results.length - passed
  const rows = results.map((result, index) => `| ${index + 1} | ${result.name} | ${result.ok ? "ناجح" : "فشل"} | ${formatDuration(result.durationMs)} |`).join("\n")
  const failures = results.filter((result) => !result.ok).map((result) => `### ${result.name}\n\n\`\`\`text\n${failureSummary(result.output)}\n\`\`\``).join("\n\n")
  const totalDuration = results.reduce((sum, result) => sum + result.durationMs, 0)
  const content = `# تقرير الجاهزية النهائية للتشغيل الفعلي\n\n**وقت التنفيذ:** ${new Intl.DateTimeFormat("ar-SA", { dateStyle: "full", timeStyle: "medium", timeZone: "Asia/Riyadh" }).format(new Date())}\n\n**النتيجة:** ${failed === 0 ? "جاهز للتشغيل الفعلي" : "غير جاهز حتى معالجة الاختبارات الفاشلة"}\n\n- بوابات الفحص الناجحة: **${passed}/${results.length}**\n- مدة الفحص الإجمالية: **${formatDuration(totalDuration)}**\n- بيئة الفحص: **Next.js Production + Supabase الفعلي + Chrome Headless**\n\n## النتائج\n\n| # | بوابة الفحص | النتيجة | المدة |\n|---:|---|---|---:|\n${rows}\n\n## نطاق التحقق\n\nشملت البوابة البناء الإنتاجي، جودة الكود، حماية الأسرار وترويسات HTTP، الحسابات والتفعيل واستعادة كلمة المرور، صلاحيات المدير والدلّال والبوّاب، دورة دخول البضاعة والترسية والسند، العمولات، المشترين، الزوار، التقارير والتصدير والطباعة، الإعدادات العامة، الأخبار، Realtime، PWA، الأداء، الاستجابة، وAccessibility.\n${failures ? `\n## تفاصيل الفشل\n\n${failures}\n` : ""}\n## سجلات التنفيذ\n\nتوجد السجلات التفصيلية لكل بوابة داخل مجلد \`artifacts/release-logs\`.\n`
  await writeFile(reportPath, content, "utf8")
}

await mkdir(logDirectory, { recursive: true })

try {
  console.log("\n[1/3] فحص جودة الكود")
  results.push(await runProcess("ESLint", [eslintBin, "."], { logName: "eslint", timeout: 180_000 }))
  if (!results.at(-1).ok) throw new Error("فشل ESLint")

  console.log("\n[2/3] بناء نسخة الإنتاج")
  results.push(await runProcess("Production build", [nextBin, "build"], { logName: "production-build", timeout: 300_000, nodeEnv: "production" }))
  if (!results.at(-1).ok) throw new Error("فشل بناء نسخة الإنتاج")

  console.log("\n[3/3] تشغيل اختبارات الجاهزية على نسخة الإنتاج")
  let serverOutput = ""
  server = spawn(process.execPath, [nextBin, "start"], {
    cwd: root,
    env: { ...process.env, NODE_ENV: "production" },
    windowsHide: true,
  })
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString()
    process.stdout.write(chunk)
  })
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString()
    process.stderr.write(chunk)
  })
  await waitForServer()

  for (const [index, [name, script]] of suites.entries()) {
    console.log(`\n[${index + 1}/${suites.length}] ${name}`)
    const result = await runProcess(name, [resolve(root, "scripts", script)], { logName: script.replace(/\.mjs$/, ""), timeout: 360_000, nodeEnv: "production" })
    results.push(result)
    console.log(result.ok ? `PASS | ${name}` : `FAIL | ${name}`)
  }
  await writeFile(resolve(logDirectory, "production-server.log"), serverOutput, "utf8")
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  results.push({ name: "تشغيل بوابة الجاهزية", ok: false, exitCode: 1, durationMs: 0, output: message })
} finally {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM")
    await new Promise((resolveWait) => {
      const timer = setTimeout(resolveWait, 5_000)
      server.once("close", () => {
        clearTimeout(timer)
        resolveWait()
      })
    })
  }
  await writeReport()
}

const failures = results.filter((result) => !result.ok)
if (failures.length) {
  console.error(`\nفشلت ${failures.length} بوابة. راجع ${reportPath}`)
  process.exitCode = 1
} else {
  console.log(`\nاكتملت بوابة الجاهزية بنجاح. التقرير: ${reportPath}`)
}
