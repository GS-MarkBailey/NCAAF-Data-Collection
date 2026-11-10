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
      text: '**Settings dialog** — gear entry point for Log and Field tabs',
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
      text: '**Inline clock edits** — Variant B numeric clock panel (period / time) and period editor',
      featureIds: ['clock-numeric-editor', 'clock-period-editor'],
    },
    {
      text: '**Inline scoreboard edits** — tap QTR / DOWN / TO GO / BL ON fills the Scoreboard card content with the editor (no popup)',
      featureIds: [
        'clock-period-editor',
        'down-distance-editor',
        'ball-on-editor',
      ],
    },
    {
      text: '**Start / Pause chips** — Play/Pause icons with green Start / red Pause; larger invisible tap target',
      featureIds: ['start-pause-chips'],
    },
    {
      text: '**END PERIOD** — red header action on the Scoreboard card (Undo-sized) after Start begins the period',
      featureIds: ['end-period-chip'],
    },
    {
      text: '**Global Undo** — header icon next to Collected datapoints reverses the last operator change',
      featureIds: ['header-undo'],
    },
    {
      text: '**Profile** — header icon opens signed-in email dialog',
      featureIds: ['profile-dialog'],
    },
    {
      text: '**Unreliable risk** — pinned bottom-right with amber idle emphasis',
      featureIds: ['unreliable-risk'],
    },
    {
      text: '**Play controls** — KICK OFF (pregame), then SNAP and progressive datapoints; yard adjusters stay visible for the whole match',
      featureIds: [
        'play-controls-idle',
        'play-controls-choose-type',
        'play-controls-pass-result',
        'play-controls-live',
      ],
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
      featureIds: ['clock-numeric-editor', 'clock-period-editor'],
    },
    'clock-polish': {
      featureIds: ['start-pause-chips', 'clock-side-nudge', 'end-period-chip'],
    },
    'down-distance': {
      featureIds: ['down-distance-editor', 'ball-on-editor'],
    },
    'header-undo': { featureIds: ['header-undo'] },
    profile: { featureIds: ['profile-dialog'] },
    'unreliable-risk': { featureIds: ['unreliable-risk'] },
    'play-controls': {
      featureIds: [
        'play-controls-idle',
        'play-controls-choose-type',
        'play-controls-pass-result',
        'play-controls-live',
      ],
    },
    'play-collection': {
      featureIds: [
        'play-controls-choose-type',
        'play-controls-pass-result',
        'play-controls-live',
      ],
    },
  },
}
