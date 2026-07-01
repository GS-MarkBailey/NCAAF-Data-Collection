export const QUARTER_LENGTH_SECONDS = 15 * 60
export const DEMO_CLOCK_SECONDS = 30
export const REGULATION_QUARTERS = 4
export const MIN_PERIOD = 1
export const MAX_PERIOD = 5

export function clampPeriod(period: number): number {
  return Math.max(MIN_PERIOD, Math.min(MAX_PERIOD, Math.round(period)))
}

export function isAwaitingQuarterStart(clock: {
  seconds: number
  period: number
}): boolean {
  return clock.seconds === 0 && clock.period < REGULATION_QUARTERS
}

export function isRegulationComplete(clock: {
  seconds: number
  period: number
}): boolean {
  return clock.seconds === 0 && clock.period >= REGULATION_QUARTERS
}

export function nextQuarterNumber(period: number): number {
  return period + 1
}

export type QuarterStatus = 'in_play' | 'in_progress' | 'ended'

export function getQuarterStatus(clock: {
  seconds: number
  running: boolean
}): QuarterStatus {
  if (clock.seconds === 0) return 'ended'
  if (clock.running) return 'in_play'
  return 'in_progress'
}

export const CLOCK_EDIT_MAX_MINUTES = 15
export const CLOCK_EDIT_MAX_SECONDS = 59

export function clockToParts(totalSeconds: number): {
  minutes: number
  seconds: number
} {
  const clamped = Math.max(0, totalSeconds)
  return {
    minutes: Math.min(CLOCK_EDIT_MAX_MINUTES, Math.floor(clamped / 60)),
    seconds: Math.min(CLOCK_EDIT_MAX_SECONDS, clamped % 60),
  }
}

export function clockFromParts(minutes: number, seconds: number): number {
  return (
    Math.max(0, Math.min(CLOCK_EDIT_MAX_MINUTES, minutes)) * 60 +
    Math.max(0, Math.min(CLOCK_EDIT_MAX_SECONDS, seconds))
  )
}
