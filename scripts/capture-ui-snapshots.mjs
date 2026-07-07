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
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'docs', 'ui-snapshots')
const GAME_ID = 'NCAAF-2026-001'
const PREVIEW_PORT = 4173
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`

const MILESTONES = [
  { label: 'week-1', commit: '1cbc5bb', date: '2026-06-18' },
  { label: 'week-2', commit: '615f79c', date: '2026-06-23' },
  { label: 'week-3', commit: 'dd1f58f', date: '2026-07-03' },
  { label: 'week-4', commit: 'HEAD', date: '2026-07-07' },
]

const VIEWPORTS = [
  { name: 'fixtures-portrait', path: '/fixtures', device: 'iPhone 14' },
  { name: 'fixtures-landscape', path: '/fixtures', width: 844, height: 390 },
  {
    name: 'game-portrait',
    path: `/game/${GAME_ID}`,
    device: 'iPhone 14',
  },
  {
    name: 'game-landscape',
    path: `/game/${GAME_ID}`,
    width: 844,
    height: 390,
  },
]

function parseArgs(argv) {
  const opts = { milestones: false, label: null, url: null, commit: null }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--milestones') opts.milestones = true
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

async function prepareGamePage(page) {
  const attacksRight = page.getByRole('button', { name: /attacks right/i })
  try {
    await attacksRight.waitFor({ state: 'visible', timeout: 3000 })
    await attacksRight.click()
    await page.waitForTimeout(500)
  } catch {
    /* Field direction dialog not shown (older builds or flag off) */
  }

  const dismissToast = page.getByRole('button', { name: /dismiss notification/i })
  try {
    await dismissToast.waitFor({ state: 'visible', timeout: 3000 })
    await dismissToast.click()
    await page.waitForTimeout(350)
  } catch {
    /* Demo error toast not shown yet */
  }
}

async function captureScreens(baseUrl, label) {
  const outPath = path.join(OUT_DIR, label)
  await mkdir(outPath, { recursive: true })

  const browser = await chromium.launch()
  try {
    for (const view of VIEWPORTS) {
      const contextOptions = view.device
        ? devices[view.device]
        : {
            viewport: { width: view.width, height: view.height },
            userAgent: devices['iPhone 14'].userAgent,
            isMobile: true,
            hasTouch: true,
          }

      const context = await browser.newContext(contextOptions)
      const page = await context.newPage()
      const target = `${baseUrl.replace(/\/$/, '')}${view.path}`

      try {
        await page.goto(target, { waitUntil: 'networkidle', timeout: 30_000 })
        if (view.path.startsWith('/game/')) {
          await prepareGamePage(page)
        }
        await page.waitForTimeout(800)
        const file = path.join(outPath, `${view.name}.png`)
        await page.screenshot({ path: file, fullPage: true })
        console.log(`  ✓ ${file}`)
      } catch (err) {
        console.warn(`  ✗ ${view.name}: ${err.message}`)
      } finally {
        await context.close()
      }
    }

    const meta = {
      label,
      capturedAt: new Date().toISOString(),
      baseUrl,
      routes: VIEWPORTS.map((v) => v.path),
    }
    const metaPath = path.join(outPath, 'meta.json')
    await import('node:fs/promises').then((fs) =>
      fs.writeFile(metaPath, JSON.stringify(meta, null, 2)),
    )
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
  --milestones       Capture week-1 … week-4 milestone commits from git history

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
