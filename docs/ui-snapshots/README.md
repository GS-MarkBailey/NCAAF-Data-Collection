# UI snapshots

Automated screenshots for build-in-public / Confluence posts.

## Capture

```bash
# Current production
npm run capture:snapshots -- --url https://ncaaf-data-collection.vercel.app --label week-4-prod

# Rebuild a historical commit locally (git worktree + vite preview)
npm run capture:snapshots -- --commit 1cbc5bb --label week-1

# All weekly milestones (week-1 … week-4)
npm run capture:snapshots -- --milestones
```

Each run writes PNGs under `docs/ui-snapshots/<label>/`:

- `fixtures-portrait.png` — iPhone 14, `/fixtures`
- `fixtures-landscape.png` — landscape, `/fixtures`
- `game-portrait.png` — iPhone 14, `/game/NCAAF-2026-001`
- `game-landscape.png` — landscape game view
- `features/*.png` — feature-specific states for that week (see `scripts/ui-snapshot-features.mjs`)
- `meta.json` — capture timestamp, URLs, and feature list

Game screenshots dismiss the field-direction dialog first (clicks “Attacks right”), then close the demo error toast so the console is unobstructed — except for deliberate feature shots (`field-direction-dialog`, `error-toast`).

### Feature scenarios per week

| Week | Features captured |
|------|-------------------|
| 1 | Take Control confirm/active, action log, risk toggle, clock ±1s |
| 2 | Feature flags panel |
| 3 | Field direction dialog, clock wheel editor, connection status, error toast, settings |
| 4 | Fixtures filters, status chips, portrait stack, past fixture ended |

Edit scenarios in `scripts/ui-snapshot-features.mjs`.

## CI (GitHub Actions)

Workflow: `.github/workflows/ui-snapshots.yml`

- **On push to `main`** (when `src/` changes): captures production and uploads artifacts (`deploy-<sha>` label).
- **Manual run** (Actions → UI snapshots → Run workflow):
  - `production` — current Vercel only
  - `milestones` — rebuilds week-1 … week-4 from git (~4 min)

Download PNGs from the run’s **Artifacts** tab. They are not committed automatically.

## Other ways to get history

- **Vercel → Deployments** — open an old deployment URL and screenshot manually.
- **Visual diff tools** — Percy, Chromatic, or Lost Pixel on top of this script in CI.
- **Confluence doc** — weekly images are embedded in `docs/confluence-weekly-build-in-public.md`.
