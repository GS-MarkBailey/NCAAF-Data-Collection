#!/usr/bin/env node
/**
 * Copy snapshot PNGs to docs/confluence-attachments/ using flat attachment filenames.
 * Upload that folder to your Confluence page (drag-and-drop or npm run upload:confluence-attachments).
 */

import { access, copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { attachmentFileName } from './confluence-image.mjs'
import { WEEK_FEATURES } from './ui-snapshot-features.mjs'
import { SNAPSHOT_WEEKS } from './ui-snapshot-weeks.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SNAPSHOTS_DIR = path.join(ROOT, 'docs', 'ui-snapshots')
const STAGE_DIR = path.join(ROOT, 'docs', 'confluence-attachments')

async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function collectRelPaths() {
  const relPaths = new Set()

  for (const week of SNAPSHOT_WEEKS) {
    relPaths.add(`${week.label}/fixtures-landscape.png`)
    relPaths.add(`${week.label}/game-landscape.png`)

    for (const feature of WEEK_FEATURES[week.label] ?? []) {
      relPaths.add(`${week.label}/features/${feature.id}.png`)
    }
  }

  return [...relPaths].sort()
}

async function main() {
  await mkdir(STAGE_DIR, { recursive: true })

  const manifest = []

  for (const relPath of collectRelPaths()) {
    const source = path.join(SNAPSHOTS_DIR, relPath)
    if (!(await fileExists(source))) {
      console.warn(`  skip (missing): ${relPath}`)
      continue
    }

    const attachmentName = attachmentFileName(relPath)
    const dest = path.join(STAGE_DIR, attachmentName)
    await copyFile(source, dest)
    manifest.push({ relPath, attachmentName })
    console.log(`  ✓ ${attachmentName}`)
  }

  await writeFile(
    path.join(STAGE_DIR, 'manifest.json'),
    JSON.stringify({ stagedAt: new Date().toISOString(), files: manifest }, null, 2),
  )

  console.log(`\nStaged ${manifest.length} file(s) → ${STAGE_DIR}`)
  console.log('Upload to Confluence: drag this folder onto the page, or npm run upload:confluence-attachments')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
