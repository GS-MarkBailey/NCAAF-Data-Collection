import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

export function loadEnvFile(envPath) {
  return readFile(envPath, 'utf8')
    .then((text) => {
      for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        let value = trimmed.slice(eq + 1).trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        if (!process.env[key]) process.env[key] = value
      }
    })
    .catch(() => {})
}

export function confluenceConfig() {
  const baseUrl = process.env.CONFLUENCE_BASE_URL?.trim().replace(/\/$/, '')
  const email = process.env.CONFLUENCE_EMAIL?.trim()
  const token = process.env.CONFLUENCE_API_TOKEN?.trim()
  const pageId = process.env.CONFLUENCE_PAGE_ID?.trim()

  const missing = []
  if (!baseUrl) missing.push('CONFLUENCE_BASE_URL')
  if (!email) missing.push('CONFLUENCE_EMAIL')
  if (!token) missing.push('CONFLUENCE_API_TOKEN')
  if (!pageId) missing.push('CONFLUENCE_PAGE_ID')

  if (missing.length > 0) {
    throw new Error(
      `Missing Confluence config: ${missing.join(', ')}\nCopy .env.example → .env and fill in your site details.`,
    )
  }

  return {
    baseUrl,
    email,
    token,
    pageId,
    authHeader: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
  }
}

async function confluenceFetch(config, urlPath, options = {}) {
  const res = await fetch(`${config.baseUrl}${urlPath}`, {
    ...options,
    headers: {
      Authorization: config.authHeader,
      Accept: 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Confluence API ${urlPath} → ${res.status}: ${body.slice(0, 400)}`)
  }

  if (res.status === 204) return null
  return res.json()
}

export async function fetchPage(config, pageId = config.pageId) {
  return confluenceFetch(
    config,
    `/rest/api/content/${pageId}?expand=body.storage,version,space`,
  )
}

export async function updatePageStorage(config, page, storageHtml, versionMessage) {
  const payload = {
    id: page.id,
    type: 'page',
    title: page.title,
    space: { key: page.space.key },
    body: {
      storage: {
        value: storageHtml,
        representation: 'storage',
      },
    },
    version: {
      number: page.version.number + 1,
      message: versionMessage ?? 'Update from NCAAF build-in-public pipeline',
    },
  }

  return confluenceFetch(config, `/rest/api/content/${page.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function uploadAttachments(config, pageId, attachmentsDir) {
  const files = (await readdir(attachmentsDir))
    .filter((f) => f.endsWith('.png'))
    .sort()

  if (files.length === 0) {
    throw new Error(`No PNG attachments found in ${attachmentsDir}`)
  }

  const form = new FormData()
  for (const filename of files) {
    const buffer = await readFile(path.join(attachmentsDir, filename))
    form.append('file', new Blob([buffer], { type: 'image/png' }), filename)
  }

  const res = await fetch(
    `${config.baseUrl}/rest/api/content/${pageId}/child/attachment`,
    {
      method: 'POST',
      headers: {
        Authorization: config.authHeader,
        'X-Atlassian-Token': 'no-check',
      },
      body: form,
    },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Attachment upload failed (${res.status}): ${body.slice(0, 400)}`)
  }

  return files.length
}
