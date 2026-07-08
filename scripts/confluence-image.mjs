import { execSync } from 'node:child_process'

const FALLBACK = {
  owner: 'GS-MarkBailey',
  repo: 'NCAAF-Data-Collection',
  branch: 'main',
}

/** @typedef {'attachments' | 'github'} ConfluenceImageMode */

/**
 * How snapshot images are referenced in the Confluence markdown doc.
 *
 * - github (default): raw.githubusercontent.com URLs — used in markdown and Confluence publish
 * - attachments: flat filenames for Confluence page attachments (set CONFLUENCE_IMAGE_MODE=attachments)
 */
export function resolveImageMode() {
  const mode = process.env.CONFLUENCE_IMAGE_MODE?.toLowerCase() ?? 'github'
  return mode === 'attachments' ? 'attachments' : 'github'
}

/** week-3/features/connection-status.png → week-3--connection-status.png */
export function attachmentFileName(relPath) {
  return relPath.replace(/^\.\//, '').replace(/\//g, '--')
}

/** Branch used in raw GitHub image URLs (always main unless overridden). */
export function resolveImageBranch() {
  return process.env.CONFLUENCE_IMAGE_BRANCH?.trim() || FALLBACK.branch
}

function resolveGitHubRepo(rootDir) {
  try {
    const remote = execSync('git remote get-url origin', {
      cwd: rootDir,
      encoding: 'utf8',
    }).trim()
    const match = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/i)
    if (!match) throw new Error('Origin is not a GitHub remote')
    const [, owner, repo] = match
    return { owner, repo }
  } catch {
    return { owner: FALLBACK.owner, repo: FALLBACK.repo }
  }
}

export function resolveSnapshotImageBase(rootDir) {
  const override = process.env.CONFLUENCE_IMAGE_BASE_URL?.replace(/\/$/, '')
  if (override) return override

  const { owner, repo } = resolveGitHubRepo(rootDir)
  const branch = resolveImageBranch()
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/docs/ui-snapshots`
}

/** Extract snapshot rel path from a raw GitHub URL, or null. */
export function snapshotRelPathFromUrl(url) {
  const match = String(url).match(/\/docs\/ui-snapshots\/(.+\.png)(?:\?.*)?$/i)
  return match?.[1] ?? null
}

export function snapshotUrlToAttachment(url) {
  const relPath = snapshotRelPathFromUrl(url)
  return relPath ? attachmentFileName(relPath) : null
}

export function snapshotImageUrl(base, relPath) {
  return `${base}/${relPath.replace(/^\.\//, '')}`
}

/** Markdown image embed for the Confluence doc. */
export function snapshotImageMarkdown(mode, imageBase, relPath, alt) {
  if (mode === 'github') {
    return `![${alt}](${snapshotImageUrl(imageBase, relPath)})`
  }
  return `![${alt}](${attachmentFileName(relPath)})`
}
