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
- `meta.json` — capture timestamp and URLs

## Other ways to get history

- **Vercel → Deployments** — open an old deployment URL and screenshot manually.
- **Visual diff tools** — Percy, Chromatic, or Lost Pixel on top of this script in CI.
- **Going forward** — run `--milestones` weekly or add a GitHub Action that uploads artifacts on each deploy.
