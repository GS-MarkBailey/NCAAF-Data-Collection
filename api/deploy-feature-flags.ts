import { writeFileSync } from 'node:fs'
import path from 'node:path'

type FeatureFlagPayload = {
  version?: number
  updatedAt?: string
  flags: Record<string, boolean>
  passphrase?: string
}

const LOCKED_ON = new Set(['header.settings'])
const DEFAULTS_PATH = 'public/feature-flag-defaults.json'

function normalizePayload(payload: FeatureFlagPayload) {
  if (!payload.flags || typeof payload.flags !== 'object') {
    throw new Error('Missing feature flags.')
  }

  for (const [key, value] of Object.entries(payload.flags)) {
    if (typeof value !== 'boolean') {
      throw new Error(`Invalid value for feature flag "${key}".`)
    }
  }

  for (const id of LOCKED_ON) {
    payload.flags[id] = true
  }

  return {
    version: typeof payload.version === 'number' ? payload.version : Date.now(),
    updatedAt: payload.updatedAt ?? new Date().toISOString(),
    flags: payload.flags,
  }
}

async function deployToGitHub(payload: ReturnType<typeof normalizePayload>) {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPOSITORY

  if (!token || !repo) {
    throw new Error(
      'GitHub deploy is not configured. Set GITHUB_TOKEN and GITHUB_REPOSITORY on Vercel.',
    )
  }

  const [owner, repoName] = repo.split('/')
  if (!owner || !repoName) {
    throw new Error('GITHUB_REPOSITORY must be in owner/repo format.')
  }

  const branch = process.env.GITHUB_BRANCH ?? 'main'
  const filePath = DEFAULTS_PATH
  const apiBase = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`

  const existingResponse = await fetch(`${apiBase}?ref=${branch}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  let sha: string | undefined
  if (existingResponse.ok) {
    const existing = (await existingResponse.json()) as { sha?: string }
    sha = existing.sha
  } else if (existingResponse.status !== 404) {
    throw new Error('Unable to read current feature flag defaults from GitHub.')
  }

  const content = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`).toString(
    'base64',
  )

  const commitResponse = await fetch(apiBase, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      message: `Deploy feature flag defaults (${payload.updatedAt})`,
      content,
      branch,
      sha,
    }),
  })

  if (!commitResponse.ok) {
    const errorBody = await commitResponse.text()
    throw new Error(
      errorBody || 'GitHub rejected the feature flag defaults update.',
    )
  }
}

function deployLocally(payload: ReturnType<typeof normalizePayload>) {
  const target = path.join(process.cwd(), DEFAULTS_PATH)
  writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

export default async function handler(
  req: { method?: string; body?: FeatureFlagPayload },
  res: {
    status: (code: number) => { json: (body: unknown) => void }
  },
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  try {
    const body = req.body
    if (!body) {
      return res.status(400).json({ error: 'Missing request body.' })
    }

    const expectedSecret = process.env.FEATURE_FLAG_DEPLOY_SECRET
    const providedSecret = body.passphrase ?? ''

    if (expectedSecret && providedSecret !== expectedSecret) {
      return res.status(401).json({ error: 'Invalid deploy passphrase.' })
    }

    const payload = normalizePayload(body)

    if (process.env.VERCEL === '1') {
      await deployToGitHub(payload)
    } else {
      deployLocally(payload)
    }

    return res.status(200).json(payload)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to deploy feature flags.'
    return res.status(500).json({ error: message })
  }
}
