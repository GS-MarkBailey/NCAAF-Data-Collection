#!/usr/bin/env node
/**
 * One-command Confluence publish:
 *   1. Sync markdown (GitHub raw image URLs)
 *   2. Replace page body via REST API
 *
 * Setup: copy .env.example → .env (gitignored) and fill in Confluence details.
 * Push snapshot PNGs to GitHub before publishing so raw URLs resolve.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { confluenceConfig, fetchPage, loadEnvFile, updatePageStorage } from './confluence-api.mjs'
import {
  markdownTitle,
  markdownToConfluenceStorage,
} from './markdown-to-confluence-storage.mjs'
import { syncConfluenceDoc } from './sync-confluence-snapshots.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DOC_PATH = path.join(ROOT, 'docs', 'confluence-weekly-build-in-public.md')

async function main() {
  await loadEnvFile(path.join(ROOT, '.env'))
  const config = confluenceConfig()

  console.log('1/2 Syncing markdown (GitHub image URLs)…')
  await syncConfluenceDoc({ write: true, mode: 'github' })

  console.log('2/2 Updating Confluence page…')
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
