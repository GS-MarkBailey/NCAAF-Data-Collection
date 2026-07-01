#!/bin/bash
# Auto-commit and push after Cursor agent finishes so Vercel deploys from GitHub.

set -euo pipefail

cat > /dev/null # consume hook stdin

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$ROOT" ]; then
  exit 0
fi

cd "$ROOT"

if ! git rev-parse --git-dir > /dev/null 2>&1; then
  exit 0
fi

# Use macOS keychain; ~/.gitconfig may point at a stale temporary gh binary.
git_push() {
  local branch="$1"
  git -c credential.https://github.com.helper=osxkeychain \
      -c credential.https://gist.github.com.helper=osxkeychain \
      push origin "$branch"
}

push_if_ahead() {
  local branch="$1"
  local ahead=0

  ahead="$(git rev-list --count "origin/${branch}..HEAD" 2>/dev/null || echo 0)"
  if [ "$ahead" -gt 0 ]; then
    git_push "$branch"
  fi
}

BRANCH="$(git branch --show-current)"
if [ -z "$BRANCH" ]; then
  exit 0
fi

# Publish any commits that failed to push previously.
push_if_ahead "$BRANCH" || true

# Skip if nothing changed (tracked, staged, or untracked).
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  exit 0
fi

git add -A

# Never auto-commit common secret files even if present locally.
for secret in .env .env.local .env.production credentials.json; do
  if git diff --cached --name-only -- "$secret" | grep -q .; then
    git reset HEAD -- "$secret" 2>/dev/null || true
  fi
done

if git diff --cached --quiet; then
  exit 0
fi

TIMESTAMP="$(date -u +'%Y-%m-%d %H:%M UTC')"
FILES="$(git diff --cached --name-only | head -5 | tr '\n' ', ' | sed 's/, $//')"
MSG="Auto-deploy: Cursor changes (${TIMESTAMP})"

if [ -n "$FILES" ]; then
  MSG="${MSG}

${FILES}"
fi

git commit -m "$MSG"
git_push "$BRANCH"

exit 0
