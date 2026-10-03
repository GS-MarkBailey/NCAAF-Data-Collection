export const MIN_DOWN = 1
export const MAX_DOWN = 4
export const MIN_DISTANCE = 1
export const MAX_DISTANCE = 99
/** Standard to-go after a first down or change of possession. */
export const FIRST_DOWN_DISTANCE = 10

export function clampDown(down: number): number {
  if (Number.isNaN(down)) return MIN_DOWN
  return Math.max(MIN_DOWN, Math.min(MAX_DOWN, Math.round(down)))
}

export function clampDistance(distance: number): number {
  if (Number.isNaN(distance)) return MIN_DISTANCE
  return Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, Math.round(distance)))
}

export function parseDownInput(raw: string): number | null {
  const digits = raw.trim().replace(/\D/g, '')
  if (!digits) return null
  return clampDown(Number.parseInt(digits, 10))
}

export function parseDistanceInput(raw: string): number | null {
  const trimmed = raw.trim().toUpperCase()
  if (trimmed === 'G' || trimmed === 'GOAL') return MIN_DISTANCE
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  return clampDistance(Number.parseInt(digits, 10))
}
