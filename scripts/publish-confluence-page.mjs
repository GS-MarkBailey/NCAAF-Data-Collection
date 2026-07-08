#!/usr/bin/env node
/**
 * One-command Confluence publish:
 *   1. Sync markdown (GitHub raw image URLs — source of truth in git)
 *   2. Stage + upload PNGs as page attachments (reliable for all viewers)
 *   3. Replace page body via REST API (attachments, not external URLs)
 *
 * Setup: copy .env.example → .env (gitignored) and fill in Confluence details.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { confluenceConfig, fetchPage, loadEnvFile, updatePageStorage, uploadAttachments } from './confluence-api.mjs'
import {
  markdownTitle,
  markdownToConfluenceStorage,
} from './markdown-to-confluence-storage.mjs'
import { stageConfluenceAttachments, STAGE_DIR } from './stage-confluence-attachments.mjs'
import { syncConfluenceDoc } from './sync-confluence-snapshots.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DOC_PATH = path.join(ROOT, 'docs', 'confluence-weekly-build-in-public.md')

async function main() {
  await loadEnvFile(path.join(ROOT, '.env'))
  const config = confluenceConfig()

  console.log('1/4 Syncing markdown (GitHub image URLs in repo)…')
  await syncConfluenceDoc({ write: true, mode: 'github' })

  console.log('2/4 Staging attachments…')
  const staged = await stageConfluenceAttachments()
  if (staged.length === 0) {
    throw new Error('No snapshot PNGs found under docs/ui-snapshots/')
  }
  console.log(`     ${staged.length} PNG(s)`)

  console.log('3/4 Uploading attachments to Confluence…')
  const uploaded = await uploadAttachments(config, config.pageId, STAGE_DIR)
  console.log(`     ${uploaded} uploaded`)

  console.log('4/4 Updating Confluence page (attachment embeds for viewers)…')
  const page = await fetchPage(config)
  const markdown = await readFile(DOC_PATH, 'utf8')
  const storage = markdownToConfluenceStorage(markdown, { useAttachments: true })
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
