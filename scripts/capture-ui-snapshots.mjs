#!/usr/bin/env node
/**
 * Capture UI screenshots for build-in-public / visual history.
 *
 * Usage:
 *   npm run capture:snapshots -- --url https://ncaaf-data-collection.vercel.app --label week-4
 *   npm run capture:snapshots -- --commit 1cbc5bb --label week-1
 *   npm run capture:snapshots -- --milestones
 */

import { spawn } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices } from 'playwright'
import { WEEK_FEATURES } from './ui-snapshot-features.mjs'
import { SNAPSHOT_WEEKS, PORTRAIT_OVERVIEW_FILES, baseViewKeys, resolveWeekConfig } from './ui-snapshot-weeks.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'docs', 'ui-snapshots')
const GAME_ID = 'NCAAF-2026-001'
const PREVIEW_PORT = 4173
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`

/** iPhone 13 logical viewport (390×844 portrait, 844×390 landscape @3x). */
const IPHONE_13 = {
  portrait: { width: 390, height: 844 },
  landscape: { width: 844, height: 390 },
  deviceScaleFactor: 3,
  userAgent: devices['iPhone 13'].userAgent,
}

const MILESTONES = SNAPSHOT_WEEKS

const VIEWPORTS = {
  'fixtures-portrait': { name: 'fixtures-portrait', path: '/fixtures', device: 'iPhone 13' },
  'fixtures-landscape': {
    name: 'fixtures-landscape',
    path: '/fixtures',
    ...IPHONE_13.landscape,
  },
  'game-portrait': {
    name: 'game-portrait',
    path: `/game/${GAME_ID}`,
    device: 'iPhone 13',
  },
  'game-landscape': {
    name: 'game-landscape',
    path: `/game/${GAME_ID}`,
    ...IPHONE_13.landscape,
  },
}

function viewsForWeek(label) {
  const week = resolveWeekConfig(label)
  return baseViewKeys(week).map((key) => VIEWPORTS[key])
}

async function removePortraitOverviewFiles(outPath) {
  for (const file of PORTRAIT_OVERVIEW_FILES) {
    await rm(path.join(outPath, file), { force: true })
  }
}

function parseArgs(argv) {
  const opts = { milestones: false, current: false, label: null, url: null, commit: null }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--milestones') opts.milestones = true
    else if (arg === '--current') opts.current = true
    else if (arg === '--label') opts.label = argv[++i]
    else if (arg === '--url') opts.url = argv[++i]
    else if (arg === '--commit') opts.commit = argv[++i]
    else if (arg === '--help' || arg === '-h') opts.help = true
  }
  return opts
}

function run(cmd, args, cwd = ROOT) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: false })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`))
    })
  })
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (res.ok || res.status === 404) return
    } catch {
      /* retry */
    }
    await sleep(500)
  }
  throw new Error(`Server did not become ready: ${url}`)
}

async function withWorktree(commit, fn) {
  const safeRef = commit.replace(/[^a-zA-Z0-9.-]/g, '')
  const worktreePath = path.join(ROOT, '.snapshot-worktrees', safeRef)
  await rm(worktreePath, { recursive: true, force: true })
  await mkdir(path.dirname(worktreePath), { recursive: true })

  let preview
  try {
    await run('git', ['worktree', 'add', worktreePath, commit])
    await run('npm', ['ci'], worktreePath)
    await run('npm', ['run', 'build'], worktreePath)

    preview = spawn(
      'npm',
      ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(PREVIEW_PORT)],
      { cwd: worktreePath, stdio: 'pipe', shell: false },
    )

    await waitForServer(PREVIEW_URL)
    return await fn(PREVIEW_URL)
  } finally {
    preview?.kill('SIGTERM')
    await run('git', ['worktree', 'remove', '--force', worktreePath]).catch(() => {})
    await rm(worktreePath, { recursive: true, force: true }).catch(() => {})
  }
}

const OVERLAY_FEATURE_IDS = {
  fieldDirection: 'field-direction-dialog',
  errorToast: 'error-toast',
}

const DEFAULT_GAME_SETUP = { fieldDirection: 'dismiss', errorToast: 'dismiss' }
const ERROR_TOAST_EXIT_MS = 350
const ERROR_TOAST_STABLE_MS = 800
const ERROR_TOAST_POLL_MS = 150

function appendGameQuery(path, { snapshot = false, demoErrorToast = false } = {}) {
  const [pathname, search = ''] = path.split('?')
  const params = new URLSearchParams(search)
  if (snapshot) params.set('snapshot', '1')
  if (demoErrorToast) params.set('demoErrorToast', '1')
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

function gamePathForCapture(path, feature) {
  const setup = mergeGameSetup(feature)
  if (setup.errorToast === 'keep') {
    return appendGameQuery(path, { demoErrorToast: true })
  }
  return appendGameQuery(path, { snapshot: true })
}

function overlayOptsForFeature(feature) {
  if (!feature) {
    return { allowFieldDirection: false, allowErrorToast: false }
  }
  if (feature.id === OVERLAY_FEATURE_IDS.fieldDirection) {
    return { allowFieldDirection: true, allowErrorToast: false }
  }
  if (feature.id === OVERLAY_FEATURE_IDS.errorToast) {
    return { allowFieldDirection: false, allowErrorToast: true }
  }
  return { allowFieldDirection: false, allowErrorToast: false }
}

function mergeGameSetup(feature) {
  return { ...DEFAULT_GAME_SETUP, ...(feature?.gameSetup ?? {}) }
}

async function dismissFieldDirectionDialog(page) {
  const attacksRight = page.getByRole('button', { name: /attacks right/i })
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (!(await attacksRight.isVisible().catch(() => false))) break
      await attacksRight.click()
      await page.waitForTimeout(450)
    } catch {
      break
    }
  }

  const directionDialog = page.getByRole('dialog').filter({ hasText: /field direction/i })
  await directionDialog.waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {})
}

function errorToastAlert(page) {
  return page
    .getByRole('alert')
    .filter({ hasText: /something went wrong|please try again/i })
}

async function errorToastVisible(page) {
  return errorToastAlert(page).isVisible().catch(() => false)
}

async function clickDismissErrorToast(page) {
  const dismiss = page.getByRole('button', { name: /dismiss notification/i })
  if (!(await dismiss.isVisible().catch(() => false))) return false
  await dismiss.click({ force: true })
  return true
}

async function waitForErrorToastHidden(page) {
  await errorToastAlert(page)
    .waitFor({ state: 'hidden', timeout: 4000 })
    .catch(() => {})
  await page.waitForTimeout(ERROR_TOAST_EXIT_MS)
}

async function forceRemoveErrorToastDom(page) {
  await page.evaluate(() => {
    for (const alert of document.querySelectorAll('[role="alert"]')) {
      const text = alert.textContent ?? ''
      if (/something went wrong|please try again/i.test(text)) {
        alert.remove()
      }
    }
  })
}

async function dismissErrorToast(page) {
  const deadline = Date.now() + 10_000
  let stableMs = 0

  while (Date.now() < deadline) {
    if (await errorToastVisible(page)) {
      stableMs = 0
      if (await clickDismissErrorToast(page)) {
        await waitForErrorToastHidden(page)
        continue
      }
      await forceRemoveErrorToastDom(page)
      await page.waitForTimeout(ERROR_TOAST_EXIT_MS)
      continue
    }

    stableMs += ERROR_TOAST_POLL_MS
    if (stableMs >= ERROR_TOAST_STABLE_MS) return
    await page.waitForTimeout(ERROR_TOAST_POLL_MS)
  }

  if (await errorToastVisible(page)) {
    await clickDismissErrorToast(page)
    await waitForErrorToastHidden(page)
  }
}

async function installErrorToastSuppressor(context) {
  await context.addInitScript(() => {
    if (window.__ncaafErrorToastSuppressor) return

    const shouldSuppress = () => {
      const params = new URLSearchParams(window.location.search)
      return params.get('demoErrorToast') !== '1'
    }

    const suppress = () => {
      if (!shouldSuppress()) return
      for (const alert of document.querySelectorAll('[role="alert"]')) {
        const text = alert.textContent ?? ''
        if (!/something went wrong|please try again/i.test(text)) continue
        alert.querySelector('[aria-label="Dismiss notification"]')?.click()
        alert.remove()
      }
    }

    suppress()
    window.__ncaafErrorToastSuppressor = new MutationObserver(suppress)
    window.__ncaafErrorToastSuppressor.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })
  })
}

async function createCaptureContext(browser, view, { suppressErrorToast = false } = {}) {
  const context = await browser.newContext(contextOptionsFor(view))
  if (suppressErrorToast) {
    await installErrorToastSuppressor(context)
  }
  return context
}

async function dismissBlockingOverlays(page, opts = {}) {
  const { allowFieldDirection = false, allowErrorToast = false } = opts

  if (!allowFieldDirection) {
    await dismissFieldDirectionDialog(page)
  }

  if (!allowErrorToast) {
    await dismissErrorToast(page)
  } else {
    try {
      await errorToastAlert(page).waitFor({ state: 'visible', timeout: 5000 })
    } catch {
      await page.waitForTimeout(1200)
    }
  }
}

async function prepareGamePage(page, setup = DEFAULT_GAME_SETUP) {
  await dismissBlockingOverlays(page, {
    allowFieldDirection: setup.fieldDirection === 'keep',
    allowErrorToast: setup.errorToast === 'keep',
  })
}

function contextOptionsFor(view) {
  if (view.device) {
    return {
      userAgent: IPHONE_13.userAgent,
      viewport: IPHONE_13.portrait,
      deviceScaleFactor: IPHONE_13.deviceScaleFactor,
      isMobile: true,
      hasTouch: true,
    }
  }

  return {
    viewport: {
      width: view.width ?? IPHONE_13.landscape.width,
      height: view.height ?? IPHONE_13.landscape.height,
    },
    userAgent: IPHONE_13.userAgent,
    deviceScaleFactor: IPHONE_13.deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
  }
}

async function capturePageScreenshot(page, file, overlayOpts) {
  if (overlayOpts) {
    await dismissBlockingOverlays(page, overlayOpts)
  }
  if (!overlayOpts?.allowErrorToast) {
    await dismissErrorToast(page)
    await forceRemoveErrorToastDom(page)
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: file, fullPage: true })
  console.log(`  ✓ ${file}`)
}

async function captureView(browser, baseUrl, view, outPath) {
  const suppressErrorToast = view.path.startsWith('/game/')
  const context = await createCaptureContext(browser, view, { suppressErrorToast })
  const page = await context.newPage()
  const route = view.path.startsWith('/game/')
    ? gamePathForCapture(view.path)
    : view.path
  const target = `${baseUrl.replace(/\/$/, '')}${route}`

  try {
    await page.goto(target, { waitUntil: 'networkidle', timeout: 30_000 })
    if (view.path.startsWith('/game/')) {
      await prepareGamePage(page)
    }
    const file = path.join(outPath, `${view.name}.png`)
    await capturePageScreenshot(page, file, {
      allowFieldDirection: false,
      allowErrorToast: false,
    })
  } catch (err) {
    console.warn(`  ✗ ${view.name}: ${err.message}`)
  } finally {
    await context.close()
  }
}

async function captureFeature(browser, baseUrl, feature, featuresDir) {
  const view = VIEWPORTS[feature.viewport]
  if (!view) {
    console.warn(`  ✗ feature ${feature.id}: unknown viewport ${feature.viewport}`)
    return null
  }

  const setup = mergeGameSetup(feature)
  const suppressErrorToast =
    feature.path.startsWith('/game/') && setup.errorToast !== 'keep'
  const context = await createCaptureContext(browser, view, { suppressErrorToast })
  const page = await context.newPage()
  const route = feature.path.startsWith('/game/')
    ? gamePathForCapture(feature.path, feature)
    : feature.path
  const target = `${baseUrl.replace(/\/$/, '')}${route}`

  try {
    await page.goto(target, { waitUntil: 'networkidle', timeout: 30_000 })
    if (feature.path.startsWith('/game/')) {
      await prepareGamePage(page, mergeGameSetup(feature))
    }
    if (feature.prepare) {
      await feature.prepare(page)
    }
    if (suppressErrorToast) {
      await dismissErrorToast(page)
      await forceRemoveErrorToastDom(page)
    }
    const file = path.join(featuresDir, `${feature.id}.png`)
    await capturePageScreenshot(page, file, overlayOptsForFeature(feature))
    return { id: feature.id, title: feature.title, file: `features/${feature.id}.png` }
  } catch (err) {
    console.warn(`  ✗ feature ${feature.id}: ${err.message}`)
    return null
  } finally {
    await context.close()
  }
}

async function captureScreens(baseUrl, label) {
  const outPath = path.join(OUT_DIR, label)
  const featuresDir = path.join(outPath, 'features')
  const week = resolveWeekConfig(label)
  const views = viewsForWeek(label)
  await mkdir(featuresDir, { recursive: true })
  await removePortraitOverviewFiles(outPath)

  const browser = await chromium.launch()
  const capturedFeatures = []

  try {
    for (const view of views) {
      await captureView(browser, baseUrl, view, outPath)
    }

    const features = WEEK_FEATURES[label] ?? []
    if (features.length > 0) {
      console.log(`  → ${features.length} feature snapshot(s)`)
      for (const feature of features) {
        const result = await captureFeature(browser, baseUrl, feature, featuresDir)
        if (result) capturedFeatures.push(result)
      }
    }

    const meta = {
      label,
      portrait: week.portrait,
      capturedAt: new Date().toISOString(),
      baseUrl,
      views: views.map((v) => v.name),
      routes: [...new Set(views.map((v) => v.path))],
      features: capturedFeatures,
    }
    await writeFile(path.join(outPath, 'meta.json'), JSON.stringify(meta, null, 2))
  } finally {
    await browser.close()
  }
}

async function captureOne({ label, baseUrl, commit }) {
  console.log(`\nCapturing ${label}${commit ? ` @ ${commit}` : ''} → ${baseUrl}`)
  if (commit) {
    await withWorktree(commit, (url) => captureScreens(url, label))
  } else {
    await captureScreens(baseUrl, label)
  }
}

function printHelp() {
  console.log(`
Capture UI snapshots for Confluence / build-in-public docs.

Options:
  --url <base>       Live or preview URL (default: production)
  --commit <ref>     Build this git ref in a temporary worktree first
  --label <name>     Output folder under docs/ui-snapshots/ (required unless --milestones)
  --milestones       Capture week-1 … week-N milestone commits from git history
  --current          Capture only the latest week (last entry in ui-snapshot-weeks.mjs)

Each milestone also captures feature-specific shots under features/ (see ui-snapshot-features.mjs).

Examples:
  npm run capture:snapshots -- --url https://ncaaf-data-collection.vercel.app --label week-4-prod
  npm run capture:snapshots -- --commit 1cbc5bb --label week-1
  npm run capture:snapshots -- --milestones
`)
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    printHelp()
    return
  }

  await mkdir(OUT_DIR, { recursive: true })

  if (opts.milestones) {
    for (const m of MILESTONES) {
      const commit = m.commit === 'HEAD' ? 'HEAD' : m.commit
      await captureOne({ label: m.label, commit, baseUrl: PREVIEW_URL })
    }
    console.log(`\nDone. Snapshots in ${OUT_DIR}`)
    return
  }

  if (opts.current) {
    const current = MILESTONES[MILESTONES.length - 1]
    if (!current) {
      console.error('No weeks configured in ui-snapshot-weeks.mjs')
      process.exit(1)
    }
    const commit = current.commit === 'HEAD' ? 'HEAD' : current.commit
    const baseUrl =
      opts.url ??
      (commit === 'HEAD' && !opts.commit
        ? 'https://ncaaf-data-collection.vercel.app'
        : PREVIEW_URL)
    await captureOne({ label: current.label, baseUrl, commit: opts.commit ? commit : null })
    console.log(`\nDone. Snapshots in ${path.join(OUT_DIR, current.label)}`)
    return
  }

  if (!opts.label) {
    console.error('Error: --label is required (or use --milestones)\n')
    printHelp()
    process.exit(1)
  }

  const baseUrl =
    opts.url ??
    (opts.commit ? PREVIEW_URL : 'https://ncaaf-data-collection.vercel.app')

  await captureOne({
    label: opts.label,
    baseUrl,
    commit: opts.commit ?? null,
  })
  console.log(`\nDone. Snapshots in ${path.join(OUT_DIR, opts.label)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
