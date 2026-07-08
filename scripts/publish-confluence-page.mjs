#!/usr/bin/env node
/**
 * One-command Confluence publish:
 *   1. Sync markdown (attachment image refs)
 *   2. Stage PNGs
 *   3. Upload attachments + replace page body via REST API
 *
 * Setup: copy .env.example → .env (gitignored) and fill in Confluence details.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  confluenceConfig,
  fetchPage,
  loadEnvFile,
  updatePageStorage,
  uploadAttachments,
} from './confluence-api.mjs'
import {
  markdownTitle,
  markdownToConfluenceStorage,
} from './markdown-to-confluence-storage.mjs'
import { stageConfluenceAttachments } from './stage-confluence-attachments.mjs'
import { syncConfluenceDoc } from './sync-confluence-snapshots.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DOC_PATH = path.join(ROOT, 'docs', 'confluence-weekly-build-in-public.md')
const STAGE_DIR = path.join(ROOT, 'docs', 'confluence-attachments')

async function main() {
  await loadEnvFile(path.join(ROOT, '.env'))
  const config = confluenceConfig()

  console.log('1/4 Syncing markdown…')
  await syncConfluenceDoc({ write: true, mode: 'attachments' })

  console.log('2/4 Staging attachments…')
  const staged = await stageConfluenceAttachments()
  console.log(`     ${staged.length} PNG(s)`)

  console.log('3/4 Uploading attachments…')
  const uploaded = await uploadAttachments(config, config.pageId, STAGE_DIR)
  console.log(`     ${uploaded} uploaded`)

  console.log('4/4 Updating Confluence page…')
  const page = await fetchPage(config)
  const markdown = await readFile(DOC_PATH, 'utf8')
  const storage = markdownToConfluenceStorage(markdown)
  const title = markdownTitle(markdown)

  if (title !== page.title) {
    console.warn(`     Note: markdown title differs from page title ("${page.title}") — keeping existing page title`)
  }

  const updated = await updatePageStorage(
    config,
    page,
    storage,
    'NCAAF build-in-public doc + UI snapshots',
  )

  const pageUrl = `${config.baseUrl}${updated._links?.webui ?? `/pages/viewpage.action?pageId=${config.pageId}`}`
  console.log(`\nDone → ${pageUrl}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
