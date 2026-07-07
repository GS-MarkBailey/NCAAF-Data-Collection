#!/usr/bin/env node
/**
 * Upload docs/confluence-attachments/*.png to a Confluence page via REST API.
 *
 * Required env:
 *   CONFLUENCE_BASE_URL  e.g. https://yoursite.atlassian.net/wiki
 *   CONFLUENCE_EMAIL
 *   CONFLUENCE_API_TOKEN  https://id.atlassian.com/manage-profile/security/api-tokens
 *   CONFLUENCE_PAGE_ID    numeric page id from page URL .../pages/123456/...
 */

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STAGE_DIR = path.resolve(__dirname, '..', 'docs', 'confluence-attachments')

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    console.error(`Missing ${name}`)
    process.exit(1)
  }
  return value
}

async function main() {
  const baseUrl = requireEnv('CONFLUENCE_BASE_URL').replace(/\/$/, '')
  const email = requireEnv('CONFLUENCE_EMAIL')
  const token = requireEnv('CONFLUENCE_API_TOKEN')
  const pageId = requireEnv('CONFLUENCE_PAGE_ID')

  const auth = Buffer.from(`${email}:${token}`).toString('base64')
  const files = (await readdir(STAGE_DIR)).filter((f) => f.endsWith('.png')).sort()

  if (files.length === 0) {
    console.error(`No PNGs in ${STAGE_DIR}. Run npm run stage:confluence-attachments first.`)
    process.exit(1)
  }

  const url = `${baseUrl}/rest/api/content/${pageId}/child/attachment`

  for (const filename of files) {
    const buffer = await readFile(path.join(STAGE_DIR, filename))
    const form = new FormData()
    form.append('file', new Blob([buffer], { type: 'image/png' }), filename)

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'X-Atlassian-Token': 'no-check',
      },
      body: form,
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`  ✗ ${filename}: ${res.status} ${body.slice(0, 200)}`)
      process.exit(1)
    }

    console.log(`  ✓ ${filename}`)
  }

  console.log(`\nUploaded ${files.length} attachment(s) to page ${pageId}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
