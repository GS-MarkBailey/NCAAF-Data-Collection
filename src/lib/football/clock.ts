export const QUARTER_LENGTH_SECONDS = 15 * 60
export const DEMO_CLOCK_SECONDS = 30
export const REGULATION_QUARTERS = 4
export const MIN_PERIOD = 1
/** Manual period edits (and wheel values) — regulation is still 1–4; 5+ is overtime. */
export const MAX_PERIOD = 99

export function clampPeriod(period: number): number {
  return Math.max(MIN_PERIOD, Math.min(MAX_PERIOD, Math.round(period)))
}

/** Scoreboard / editor label: 1–4 numeric, first OT as "OT", then OT2, OT3, … */
export function formatPeriodLabel(period: number): string {
  const value = clampPeriod(period)
  if (value <= REGULATION_QUARTERS) return String(value)
  const overtimeIndex = value - REGULATION_QUARTERS
  return overtimeIndex === 1 ? 'OT' : `OT${overtimeIndex}`
}

/** Parse editor input ("3", "5", "OT", "OT2") into a clamped period number. */
export function parsePeriodInput(raw: string): number | null {
  const trimmed = raw.trim().toUpperCase()
  if (trimmed === '' || trimmed === 'O') return null
  if (trimmed === 'OT' || trimmed === 'OT1') {
    return REGULATION_QUARTERS + 1
  }
  const otMatch = /^OT(\d+)$/.exec(trimmed)
  if (otMatch) {
    const overtimeIndex = Number.parseInt(otMatch[1], 10)
    if (Number.isFinite(overtimeIndex) && overtimeIndex >= 1) {
      return clampPeriod(REGULATION_QUARTERS + overtimeIndex)
    }
  }
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  return clampPeriod(Number.parseInt(digits, 10))
}

export function isAwaitingQuarterStart(clock: {
  seconds: number
  period: number
}, gameStarted = true): boolean {
  return (
    gameStarted &&
    clock.seconds === 0 &&
    clock.period < REGULATION_QUARTERS
  )
}

export function isPeriodInProgress(
  gameStarted: boolean,
  gameEnded: boolean,
  clock: { seconds: number; period: number },
): boolean {
  return (
    gameStarted &&
    !gameEnded &&
    !isAwaitingRegulationDecision(gameStarted, gameEnded, clock) &&
    !isAwaitingQuarterStart(clock, gameStarted) &&
    clock.seconds > 0
  )
}

/** Play/pause when period workflow is off — clock-driven MVP (no kick-off required). */
export function canUsePlayPauseWithoutPeriodManagement(
  gameEnded: boolean,
  clock: { seconds: number },
): boolean {
  return !gameEnded && clock.seconds > 0
}

/** True when the operator can end the current regulation period (End PRD). */
export function canEndCurrentPeriod(
  gameStarted: boolean,
  gameEnded: boolean,
  periodEnded: boolean,
  clock: { seconds: number; period: number; running: boolean },
): boolean {
  if (!gameStarted || gameEnded || periodEnded) return false
  if (isOvertimePeriod(clock.period)) return false
  if (isAwaitingRegulationDecision(gameStarted, gameEnded, clock)) {
    return true
  }

  if (clock.seconds === 0) return true

  return !clock.running && clock.seconds > 0
}

/** True when the operator can start overtime after Q4. */
export function canStartOvertime(
  gameStarted: boolean,
  gameEnded: boolean,
  periodEnded: boolean,
  clock: { seconds: number; period: number },
): boolean {
  return (
    gameStarted &&
    !gameEnded &&
    periodEnded &&
    isAwaitingRegulationDecision(gameStarted, gameEnded, clock)
  )
}

/** True when the operator can start the next regulation period. */
export function canStartNextPeriod(
  gameStarted: boolean,
  gameEnded: boolean,
  periodEnded: boolean,
  clock: { seconds: number; period: number },
): boolean {
  return (
    gameStarted &&
    !gameEnded &&
    periodEnded &&
    isAwaitingQuarterStart(clock, gameStarted)
  )
}

export function isAwaitingRegulationDecision(
  gameStarted: boolean,
  gameEnded: boolean,
  clock: { seconds: number; period: number },
): boolean {
  return (
    gameStarted &&
    !gameEnded &&
    clock.seconds === 0 &&
    clock.period === REGULATION_QUARTERS
  )
}

export function isOvertimePeriod(period: number): boolean {
  return period > REGULATION_QUARTERS
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
  const minutes = Math.min(CLOCK_EDIT_MAX_MINUTES, Math.floor(clamped / 60))
  const seconds =
    minutes === CLOCK_EDIT_MAX_MINUTES
      ? 0
      : Math.min(CLOCK_EDIT_MAX_SECONDS, clamped % 60)

  return { minutes, seconds }
}

export function getClockEditSecondValues(minutes: number): number[] {
  if (minutes >= CLOCK_EDIT_MAX_MINUTES) return [0]
  return Array.from({ length: CLOCK_EDIT_MAX_SECONDS + 1 }, (_, index) => index)
}

export function clockFromParts(minutes: number, seconds: number): number {
  const clampedMinutes = Math.max(
    0,
    Math.min(CLOCK_EDIT_MAX_MINUTES, minutes),
  )
  const clampedSeconds =
    clampedMinutes === CLOCK_EDIT_MAX_MINUTES
      ? 0
      : Math.max(0, Math.min(CLOCK_EDIT_MAX_SECONDS, seconds))

  return clampedMinutes * 60 + clampedSeconds
}
