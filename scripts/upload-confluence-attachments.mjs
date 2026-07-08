#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { confluenceConfig, loadEnvFile, uploadAttachments } from './confluence-api.mjs'
import { STAGE_DIR, stageConfluenceAttachments } from './stage-confluence-attachments.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function main() {
  await loadEnvFile(path.join(ROOT, '.env'))
  const config = confluenceConfig()
  await stageConfluenceAttachments()
  const count = await uploadAttachments(config, config.pageId, STAGE_DIR)
  console.log(`Uploaded ${count} attachment(s) to page ${config.pageId}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
