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
 * - attachments (default): flat filenames served from Confluence page attachments
 *   — stable in the editor, no GitHub fetches while editing
 * - github: raw.githubusercontent.com URLs — good for GitHub markdown preview only
 */
export function resolveImageMode() {
  const mode = process.env.CONFLUENCE_IMAGE_MODE?.toLowerCase() ?? 'attachments'
  return mode === 'github' ? 'github' : 'attachments'
}

/** week-3/features/connection-status.png → week-3--connection-status.png */
export function attachmentFileName(relPath) {
  return relPath.replace(/^\.\//, '').replace(/\//g, '--')
}

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

/** Markdown image embed for the Confluence doc. */
export function snapshotImageMarkdown(mode, imageBase, relPath, alt) {
  if (mode === 'github') {
    return `![${alt}](${snapshotImageUrl(imageBase, relPath)})`
  }
  return `![${alt}](${attachmentFileName(relPath)})`
}
