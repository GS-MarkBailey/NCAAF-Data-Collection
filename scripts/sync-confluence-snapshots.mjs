#!/usr/bin/env node
/**
 * Regenerate auto-managed snapshot sections in the Confluence markdown doc.
 *
 * Reads:
 *   - scripts/ui-snapshot-weeks.mjs
 *   - scripts/ui-snapshot-features.mjs
 *   - docs/ui-snapshots/<week>/meta.json (when present)
 *
 * Usage:
 *   npm run sync:confluence-doc
 */

import { access, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WEEK_FEATURES } from './ui-snapshot-features.mjs'
import { SNAPSHOT_WEEKS } from './ui-snapshot-weeks.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DOC_PATH = path.join(ROOT, 'docs', 'confluence-weekly-build-in-public.md')
const SNAPSHOTS_DIR = path.join(ROOT, 'docs', 'ui-snapshots')

const MARKER = (id, part) => `<!-- AUTO-SNAPSHOTS:${id}:${part} -->`

async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function formatCommitDate(isoDate) {
  const d = new Date(`${isoDate}T12:00:00`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function img(relPath, alt) {
  return `![${alt}](./ui-snapshots/${relPath})`
}

function chunk(items, size) {
  const rows = []
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size))
  }
  return rows
}

function renderTable(headers, rows) {
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
  ]
  for (const row of rows) {
    lines.push(`| ${row.join(' | ')} |`)
  }
  return lines.join('\n')
}

async function loadWeekMeta(label) {
  const metaPath = path.join(SNAPSHOTS_DIR, label, 'meta.json')
  if (!(await fileExists(metaPath))) return null
  return JSON.parse(await readFile(metaPath, 'utf8'))
}

function weekCommitLine(week, meta) {
  const commit = week.commit === 'HEAD' ? (meta?.commit ?? 'HEAD') : week.commit
  const date = meta?.capturedAt
    ? formatCommitDate(meta.capturedAt.slice(0, 10))
    : formatCommitDate(week.date)
  return `Commit \`${commit}\` (${date}).`
}

function renderOverviewScreens(label) {
  const base = `${label}`
  return renderTable(
    ['Fixtures (portrait)', 'Fixtures (landscape)', 'Game (portrait)', 'Game (landscape)'],
    [[
      img(`${base}/fixtures-portrait.png`, `${label} fixtures portrait`),
      img(`${base}/fixtures-landscape.png`, `${label} fixtures landscape`),
      img(`${base}/game-portrait.png`, `${label} game portrait`),
      img(`${base}/game-landscape.png`, `${label} game landscape`),
    ]],
  )
}

async function renderFeatureHighlights(label, features) {
  if (features.length === 0) {
    return '_No feature snapshots configured — add scenarios in `scripts/ui-snapshot-features.mjs`._'
  }

  const available = []
  for (const feature of features) {
    const filePath = path.join(SNAPSHOTS_DIR, label, 'features', `${feature.id}.png`)
    if (await fileExists(filePath)) available.push(feature)
  }

  if (available.length === 0) {
    return '_Feature snapshots pending — run `npm run capture:and-sync`._'
  }

  const rows = chunk(available, 3)
  const blocks = rows.map((row) => {
    const headers = row.map((f) => f.title)
    const images = row.map((f) =>
      img(`${label}/features/${f.id}.png`, f.title),
    )
    return `${renderTable(headers, [images])}\n`
  })

  return blocks.join('\n').trim()
}

function renderUiEvolution(weeks) {
  const rows = weeks.map((week) => [
    week.label.replace('week-', 'Week '),
    img(`${week.label}/fixtures-portrait.png`, `${week.label} fixtures`),
    img(`${week.label}/game-landscape.png`, `${week.label} game`),
  ])
  return renderTable(['Week', 'Fixtures (portrait)', 'Game (landscape)'], rows)
}

function replaceMarkedBlock(content, id, replacement) {
  const start = MARKER(id, 'START')
  const end = MARKER(id, 'END')
  const pattern = new RegExp(
    `${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`,
    'm',
  )

  if (!pattern.test(content)) {
    throw new Error(
      `Missing markers for ${id}. Add:\\n${start}\\n...\\n${end}`,
    )
  }

  return content.replace(
    pattern,
    `${start}\n${replacement.trim()}\n${end}`,
  )
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function main() {
  let content = await readFile(DOC_PATH, 'utf8')

  content = replaceMarkedBlock(
    content,
    'ui-evolution',
    renderUiEvolution(SNAPSHOT_WEEKS),
  )

  for (const week of SNAPSHOT_WEEKS) {
    const meta = await loadWeekMeta(week.label)
    const commitLine = weekCommitLine(week, meta)
    const features =
      meta?.features?.length > 0
        ? meta.features
        : (WEEK_FEATURES[week.label] ?? []).map((f) => ({
            id: f.id,
            title: f.title,
          }))

    const block = `### UI snapshots

${commitLine}

${renderOverviewScreens(week.label)}

### Feature highlights

${await renderFeatureHighlights(week.label, features)}`

    content = replaceMarkedBlock(content, week.label, block)
  }

  const stamp = new Date().toISOString().slice(0, 10)
  content = content.replace(
    /\*\*Last updated:\*\* .+/,
    `**Last updated:** ${formatCommitDate(stamp)} (snapshots synced automatically)`,
  )

  await writeFile(DOC_PATH, content)
  console.log(`Updated ${DOC_PATH}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
