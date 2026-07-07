/** Weekly milestone config — add a row here when starting a new build-in-public week. */

export const SNAPSHOT_WEEKS = [
  { label: 'week-1', commit: '1cbc5bb', date: '2026-06-18', portrait: false },
  { label: 'week-2', commit: '615f79c', date: '2026-06-23', portrait: false },
  { label: 'week-3', commit: 'dd1f58f', date: '2026-07-03', portrait: false },
  { label: 'week-4', commit: 'HEAD', date: '2026-07-07', portrait: true },
]

/** Label for the rolling “current prod” capture (optional). */
export const PROD_SNAPSHOT_LABEL = 'week-4-prod'

export function includesPortrait(week) {
  return week.portrait === true
}

export function resolveWeekConfig(label) {
  const found = SNAPSHOT_WEEKS.find((w) => w.label === label)
  if (found) return found
  if (label === PROD_SNAPSHOT_LABEL) {
    const latest = SNAPSHOT_WEEKS[SNAPSHOT_WEEKS.length - 1]
    return latest ? { ...latest, label } : { label, portrait: true }
  }
  return { label, portrait: false }
}

/** Base overview screenshot keys per week (excludes feature scenarios). */
export function baseViewKeys(week) {
  if (includesPortrait(week)) {
    return [
      'fixtures-portrait',
      'fixtures-landscape',
      'game-portrait',
      'game-landscape',
    ]
  }
  return ['fixtures-landscape', 'game-landscape']
}

export const PORTRAIT_OVERVIEW_FILES = [
  'fixtures-portrait.png',
  'game-portrait.png',
]
