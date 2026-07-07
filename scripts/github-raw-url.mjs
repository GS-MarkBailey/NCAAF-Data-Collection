import { execSync } from 'node:child_process'

const FALLBACK = {
  owner: 'GS-MarkBailey',
  repo: 'NCAAF-Data-Collection',
  branch: 'main',
}

/**
 * Base URL for snapshot images in Confluence (GitHub raw).
 * Override with CONFLUENCE_IMAGE_BASE_URL (full base including /docs/ui-snapshots).
 */
export function resolveSnapshotImageBase(rootDir) {
  const override = process.env.CONFLUENCE_IMAGE_BASE_URL?.replace(/\/$/, '')
  if (override) return override

  try {
    const remote = execSync('git remote get-url origin', {
      cwd: rootDir,
      encoding: 'utf8',
    }).trim()
    const branch =
      execSync('git branch --show-current', { cwd: rootDir, encoding: 'utf8' }).trim() ||
      FALLBACK.branch

    const match = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/i)
    if (!match) throw new Error('Origin is not a GitHub remote')

    const [, owner, repo] = match
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/docs/ui-snapshots`
  } catch {
    return `https://raw.githubusercontent.com/${FALLBACK.owner}/${FALLBACK.repo}/${FALLBACK.branch}/docs/ui-snapshots`
  }
}

export function snapshotImageUrl(base, relPath) {
  return `${base}/${relPath.replace(/^\.\//, '')}`
}
