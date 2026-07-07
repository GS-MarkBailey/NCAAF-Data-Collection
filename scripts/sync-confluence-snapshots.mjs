#!/usr/bin/env node
/**
 * Regenerate auto-managed snapshot sections in the Confluence markdown doc.
 *
 * Sections:
 *   - ui-evolution: latest week screens only (Current screens)
 *   - week-N-interactions: feature images inline with interaction copy
 *   - week-N-shipped-<key>: feature images inline in Shipped subsections
 */

import { access, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveSnapshotImageBase, snapshotImageUrl } from './github-raw-url.mjs'
import { WEEK_INTERACTIONS, WEEK_SHIPPED } from './ui-snapshot-doc-content.mjs'
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

async function cacheBustToken(absPath) {
  try {
    const { mtimeMs } = await stat(absPath)
    return String(Math.floor(mtimeMs / 1000))
  } catch {
    return null
  }
}

function img(imageBase, relPath, alt, cacheBust) {
  return `![${alt}](${snapshotImageUrl(imageBase, relPath, cacheBust)})`
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

function latestWeek() {
  return SNAPSHOT_WEEKS[SNAPSHOT_WEEKS.length - 1]
}

function renderLatestScreens(imageBase, week, cacheBustFor) {
  const label = week.label
  return [
    `**Fixtures (landscape)**`,
    '',
    img(
      imageBase,
      `${label}/fixtures-landscape.png`,
      'Fixtures landscape',
      cacheBustFor(`${label}/fixtures-landscape.png`),
    ),
    '',
    `**Game console (landscape)**`,
    '',
    img(
      imageBase,
      `${label}/game-landscape.png`,
      'Game landscape',
      cacheBustFor(`${label}/game-landscape.png`),
    ),
  ].join('\n')
}

async function featureImage(imageBase, weekLabel, featureId, title, cacheBustFor) {
  const relPath = `${weekLabel}/features/${featureId}.png`
  const filePath = path.join(SNAPSHOTS_DIR, relPath)
  if (!(await fileExists(filePath))) return null
  return img(imageBase, relPath, title, cacheBustFor(relPath))
}

async function overviewImage(imageBase, weekLabel, fileName, cacheBustFor) {
  const relPath = `${weekLabel}/${fileName}`
  const filePath = path.join(SNAPSHOTS_DIR, relPath)
  if (!(await fileExists(filePath))) return null
  const alt = fileName.replace(/\.png$/, '').replace(/-/g, ' ')
  return img(imageBase, relPath, alt, cacheBustFor(relPath))
}

async function renderSnapshotBlock(imageBase, weekLabel, block, cacheBustFor) {
  const featureTitles = Object.fromEntries(
    (WEEK_FEATURES[weekLabel] ?? []).map((f) => [f.id, f.title]),
  )

  const images = []

  for (const fileName of block.overviewFiles ?? []) {
    const image = await overviewImage(imageBase, weekLabel, fileName, cacheBustFor)
    if (image) images.push(image)
  }

  for (const featureId of block.featureIds ?? []) {
    const image = await featureImage(
      imageBase,
      weekLabel,
      featureId,
      featureTitles[featureId] ?? featureId,
      cacheBustFor,
    )
    if (image) images.push(image)
  }

  if (images.length === 0) return ''
  return images.join(' ')
}

async function renderInteractions(imageBase, weekLabel, cacheBustFor) {
  const lines = WEEK_INTERACTIONS[weekLabel] ?? []
  if (lines.length === 0) {
    return '_No interaction screenshots configured for this week._'
  }

  const featureTitles = Object.fromEntries(
    (WEEK_FEATURES[weekLabel] ?? []).map((f) => [f.id, f.title]),
  )

  const blocks = []
  for (const line of lines) {
    blocks.push(`- ${line.text}`)
    const images = []
    for (const featureId of line.featureIds) {
      const image = await featureImage(
        imageBase,
        weekLabel,
        featureId,
        featureTitles[featureId] ?? featureId,
        cacheBustFor,
      )
      if (image) images.push(image)
    }
    if (images.length > 0) {
      blocks.push('', images.join(' '), '')
    }
  }

  return blocks.join('\n').trim()
}

async function main() {
  const imageBase = resolveSnapshotImageBase(ROOT)
  let content = await readFile(DOC_PATH, 'utf8')

  const cacheBustByRelPath = new Map()
  async function resolveCacheBust(relPath) {
    if (cacheBustByRelPath.has(relPath)) {
      return cacheBustByRelPath.get(relPath)
    }
    const token = await cacheBustToken(path.join(SNAPSHOTS_DIR, relPath))
    cacheBustByRelPath.set(relPath, token)
    return token
  }
  const cacheBustFor = (relPath) => cacheBustByRelPath.get(relPath) ?? null

  for (const week of SNAPSHOT_WEEKS) {
    for (const fileName of ['fixtures-landscape.png', 'game-landscape.png']) {
      await resolveCacheBust(`${week.label}/${fileName}`)
    }
    for (const feature of WEEK_FEATURES[week.label] ?? []) {
      await resolveCacheBust(`${week.label}/features/${feature.id}.png`)
    }
  }

  const latest = latestWeek()
  content = replaceMarkedBlock(
    content,
    'ui-evolution',
    renderLatestScreens(imageBase, latest, cacheBustFor),
  )

  for (const week of SNAPSHOT_WEEKS) {
    const interactionsMarker = `${week.label}-interactions`
    if (content.includes(MARKER(interactionsMarker, 'START'))) {
      content = replaceMarkedBlock(
        content,
        interactionsMarker,
        await renderInteractions(imageBase, week.label, cacheBustFor),
      )
    }

    for (const [key, block] of Object.entries(WEEK_SHIPPED[week.label] ?? {})) {
      const markerId = `${week.label}-shipped-${key}`
      if (!content.includes(MARKER(markerId, 'START'))) {
        console.warn(`Skipping ${markerId}: no markers in doc`)
        continue
      }
      content = replaceMarkedBlock(
        content,
        markerId,
        await renderSnapshotBlock(imageBase, week.label, block, cacheBustFor),
      )
    }
  }

  const stamp = new Date().toISOString().slice(0, 10)
  content = content.replace(
    /\*\*Last updated:\*\* .+/,
    `**Last updated:** ${formatCommitDate(stamp)} (snapshots synced automatically)`,
  )

  await writeFile(DOC_PATH, content)
  console.log(`Updated ${DOC_PATH}`)
  console.log(`Image base: ${imageBase}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
