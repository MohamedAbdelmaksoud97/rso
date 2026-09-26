import { chromium } from "playwright-core"
import { createClient } from "@supabase/supabase-js"
import { mkdir, readFile } from "node:fs/promises"
import { resolve } from "node:path"

const env = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=")
      return [line.slice(0, separator), line.slice(separator + 1)]
    }),
)

const baseUrl = "http://localhost:3000"
const screenshots = resolve("artifacts/screenshots")
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

await mkdir(screenshots, { recursive: true })

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
})

let entryId

try {
  const context = await browser.newContext({ viewport: { width: 2048, height: 1100 } })
  const page = await context.newPage()
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" })
  await page.locator("#email").fill(env.RSO_GATEKEEPER_EMAIL)
  await page.locator("#password").fill(env.RSO_GATEKEEPER_PASSWORD)
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith("/dashboard"), { timeout: 20_000 }),
    page.getByRole("button", { name: "دخول إلى المنصة" }).click(),
  ])

  await page.goto(`${baseUrl}/dashboard/entries/new`, { waitUntil: "networkidle" })
  await page.locator("#entry_kind").selectOption("visitor")
  await Promise.all([
    page.waitForURL(/\/dashboard\/entries\/\d+$/, { timeout: 20_000 }),
    page.getByRole("button", { name: "تسجيل دخول الزائر" }).click(),
  ])
  entryId = Number(new URL(page.url()).pathname.split("/").at(-1))
  await page.getByText("تم تسجيل دخول الزائر", { exact: true }).waitFor()

  const sidebar = page.locator('[data-slot="sidebar"]:not([data-mobile])')
  if (await sidebar.getAttribute("data-state") !== "collapsed") {
    await page.locator('[data-sidebar="trigger"]').click()
    await page.waitForFunction(() => document.querySelector('[data-slot="sidebar"]:not([data-mobile])')?.getAttribute("data-state") === "collapsed")
  }
  await page.waitForTimeout(350)

  const collapsedWidth = Math.round(await page.locator('[data-slot="sidebar-container"]').evaluate((element) => element.getBoundingClientRect().width))
  assert(collapsedWidth <= 50, `Collapsed sidebar is wider than expected: ${collapsedWidth}px`)

  const brandMark = page.locator('[data-slot="sidebar-header"] a:has(img[src*="pwa-192x192.png"])')
  await brandMark.waitFor({ state: "visible" })
  assert((await brandMark.locator('img[src*="pwa-192x192.png"]').count()) === 1, "Collapsed sidebar does not use the RSU brand mark")

  const card = page.locator("[data-print-sheet]")
  const spacing = await card.evaluate((element) => {
    const header = element.querySelector('[data-slot="card-header"]')
    const mark = header?.firstElementChild
    const title = header?.querySelector('[data-slot="card-title"]')
    const description = header?.querySelector('[data-slot="card-description"]')
    if (!header || !mark || !title || !description) return null
    const headerRect = header.getBoundingClientRect()
    const markRect = mark.getBoundingClientRect()
    const titleRect = title.getBoundingClientRect()
    const descriptionRect = description.getBoundingClientRect()
    return {
      topPadding: Math.round(markRect.top - headerRect.top),
      markToTitle: Math.round(titleRect.top - markRect.bottom),
      titleToDescription: Math.round(descriptionRect.top - titleRect.bottom),
      bottomPadding: Math.round(headerRect.bottom - descriptionRect.bottom),
    }
  })

  assert(spacing, "Could not measure the visitor confirmation header")
  assert(spacing.topPadding >= 28, `Header top padding is too small: ${spacing.topPadding}px`)
  assert(spacing.markToTitle >= 10, `Brand mark and title are too close: ${spacing.markToTitle}px`)
  assert(spacing.titleToDescription >= 7, `Title and description are too close: ${spacing.titleToDescription}px`)
  assert(spacing.bottomPadding >= 28, `Header bottom padding is too small: ${spacing.bottomPadding}px`)

  await page.screenshot({ path: resolve(screenshots, "layout-polish-desktop.png") })
  await brandMark.screenshot({ path: resolve(screenshots, "sidebar-collapsed-brand.png") })
  await card.screenshot({ path: resolve(screenshots, "visitor-entry-header-spacing.png") })

  await page.setViewportSize({ width: 360, height: 800 })
  await page.reload({ waitUntil: "networkidle" })
  const mobileWidth = await card.evaluate((element) => ({ card: element.scrollWidth, viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }))
  assert(mobileWidth.page <= mobileWidth.viewport + 1, `Visitor confirmation overflows at 360px: ${mobileWidth.page}px`)

  console.log(JSON.stringify({
    ok: true,
    checks: ["collapsed-rsu-brand", "confirmation-header-spacing", "mobile-responsive"],
    collapsedWidth,
    spacing,
    screenshots: ["layout-polish-desktop.png", "sidebar-collapsed-brand.png", "visitor-entry-header-spacing.png"],
  }, null, 2))

  await context.close()
} finally {
  if (entryId) {
    await service.from("activity_events").delete().eq("entity_type", "market_entry").eq("entity_id", String(entryId))
    await service.from("market_entries").delete().eq("id", entryId)
  }
  await browser.close()
}
