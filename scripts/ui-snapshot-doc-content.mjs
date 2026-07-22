/**
 * Auto-generated Confluence doc sections — interaction lines with feature screenshot IDs.
 * Edit copy here; images are resolved from ui-snapshot-features.mjs at sync time.
 */

/** @typedef {{ text: string, featureIds: string[] }} InteractionLine */

/** @typedef {{ featureIds?: string[], overviewFiles?: string[] }} ShippedSnapshotBlock */

/** @type {Record<string, InteractionLine[]>} */
export const WEEK_INTERACTIONS = {
  'week-1': [
    {
      text: '**Take Control** — operator override mode with red border/background; confirmation before activating',
      featureIds: ['take-control-confirm', 'take-control-active'],
    },
    {
      text: '**Clock** — tap to pause/start; ±1 second adjustment; visual pause state (faint red background)',
      featureIds: ['clock-adjust'],
    },
    {
      text: '**Risk toggles** — tap to activate/deactivate individual risk flags',
      featureIds: ['risk-challenge-active'],
    },
    {
      text: '**Action log** — all operator actions recorded with game clock timestamp; CSV export',
      featureIds: ['action-log'],
    },
  ],
  'week-2': [
    {
      text: '**Feature flags panel** — Settings → Features tab; groundwork for toggling panels and behaviours without code changes',
      featureIds: ['feature-flags-panel'],
    },
  ],
  'week-3': [
    {
      text: '**Field direction** — first-open dialog sets home team attacking direction; drives ball-on arrow each quarter',
      featureIds: ['field-direction-dialog'],
    },
    {
      text: '**Clock wheel editor** — iOS-style scroll pickers for period · minutes : seconds',
      featureIds: ['clock-editor'],
    },
    {
      text: '**Connection status** — chip beside back button with Heartbeat, Match State Platform, Remote Data Store',
      featureIds: ['connection-status'],
    },
    {
      text: '**Error toast** — fixture-scoped demo notification; swipe or close to dismiss',
      featureIds: ['error-toast'],
    },
    {
      text: '**Settings dialog** — Log | Field | Features tabs in a single gear entry point',
      featureIds: ['settings-tabs'],
    },
  ],
  'week-4': [
    {
      text: '**Fixtures search & refresh** — compact search on the left, refresh button on the right; pull-to-refresh on mobile',
      featureIds: ['fixtures-search'],
    },
    {
      text: '**Scheduled / past chips** — status at a glance; past fixtures open in match-ended state',
      featureIds: ['fixture-status-chips', 'past-fixture-ended'],
    },
    {
      text: '**Portrait game console** — scoreboard, play-by-play, and risks stacked vertically on iPhone',
      featureIds: ['portrait-stack'],
    },
    {
      text: '**Design variants** — Settings → Features → Design variants (Variant A display resilience, Variant B clock edit panel with Period / Time tabs)',
      featureIds: [
        'design-variants-panel',
        'clock-numeric-editor',
        'clock-period-editor',
      ],
    },
    {
      text: '**Start / Pause chips** — Play/Pause icons with green Start / red Pause; larger invisible tap target',
      featureIds: ['start-pause-chips'],
    },
    {
      text: '**Profile** — header icon opens signed-in email dialog',
      featureIds: ['profile-dialog'],
    },
    {
      text: '**Unreliable risk** — pinned bottom-right with amber idle emphasis',
      featureIds: ['unreliable-risk'],
    },
  ],
}

/**
 * Feature / overview screenshots for Shipped subsections (marker key → images).
 * Marker id in doc: `week-N-shipped-<key>`
 *
 * @type {Record<string, Record<string, ShippedSnapshotBlock>>}
 */
export const WEEK_SHIPPED = {
  'week-2': {
    'feature-flags': { featureIds: ['feature-flags-panel'] },
  },
  'week-3': {
    'feature-flags': { featureIds: ['settings-tabs'] },
    'field-direction': { featureIds: ['field-direction-dialog'] },
    clock: { featureIds: ['clock-editor'] },
    'connection-status': { featureIds: ['connection-status'] },
    'error-toast': { featureIds: ['error-toast'] },
    settings: { featureIds: ['settings-tabs'] },
  },
  'week-4': {
    'fixtures-page': { featureIds: ['fixtures-search', 'fixture-status-chips'] },
    'match-ended': { featureIds: ['past-fixture-ended'] },
    'portrait-game': { featureIds: ['portrait-stack'] },
    'design-variants': {
      featureIds: [
        'design-variants-panel',
        'clock-numeric-editor',
        'clock-period-editor',
      ],
    },
    'clock-polish': { featureIds: ['start-pause-chips'] },
    profile: { featureIds: ['profile-dialog'] },
    'unreliable-risk': { featureIds: ['unreliable-risk'] },
  },
}
