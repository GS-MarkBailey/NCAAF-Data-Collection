import {
  DEFAULT_FOOTBALL_RULESET,
  resolveFootballRuleset,
  type RulesetRef,
} from './rulesets'

/** @deprecated Prefer `rules.quarterLengthSeconds`. NCAA default. */
export const QUARTER_LENGTH_SECONDS =
  DEFAULT_FOOTBALL_RULESET.quarterLengthSeconds
export const DEMO_CLOCK_SECONDS = 30
/** @deprecated Prefer `rules.regulationPeriods`. NCAA default. */
export const REGULATION_QUARTERS = DEFAULT_FOOTBALL_RULESET.regulationPeriods
export const MIN_PERIOD = 1
/** Manual period edits (and wheel values) — regulation is still 1–N; N+1 is overtime. */
export const MAX_PERIOD = 99

export function clampPeriod(period: number): number {
  return Math.max(MIN_PERIOD, Math.min(MAX_PERIOD, Math.round(period)))
}

/**
 * Clamp game clock to the active American football ruleset period length
 * (`FootballRuleset.quarterLengthSeconds` — 15:00 for NCAA / NFL / CFL).
 * All store clock writes must go through this.
 */
export function clampClockSeconds(
  seconds: number,
  rulesRef?: RulesetRef,
): number {
  const rules = resolveFootballRuleset(rulesRef)
  if (Number.isNaN(seconds)) return 0
  return Math.max(
    0,
    Math.min(rules.quarterLengthSeconds, Math.round(seconds)),
  )
}

function regulationPeriods(rulesRef?: RulesetRef): number {
  return resolveFootballRuleset(rulesRef).regulationPeriods
}

/** Scoreboard / editor label: 1–N numeric, first OT as "OT", then OT2, OT3, … */
export function formatPeriodLabel(
  period: number,
  rulesRef?: RulesetRef,
): string {
  const value = clampPeriod(period)
  const regulation = regulationPeriods(rulesRef)
  if (value <= regulation) return String(value)
  const overtimeIndex = value - regulation
  return overtimeIndex === 1 ? 'OT' : `OT${overtimeIndex}`
}

/** Parse editor input ("3", "5", "OT", "OT2") into a clamped period number. */
export function parsePeriodInput(
  raw: string,
  rulesRef?: RulesetRef,
): number | null {
  const regulation = regulationPeriods(rulesRef)
  const trimmed = raw.trim().toUpperCase()
  if (trimmed === '' || trimmed === 'O') return null
  if (trimmed === 'OT' || trimmed === 'OT1') {
    return regulation + 1
  }
  const otMatch = /^OT(\d+)$/.exec(trimmed)
  if (otMatch) {
    const overtimeIndex = Number.parseInt(otMatch[1], 10)
    if (Number.isFinite(overtimeIndex) && overtimeIndex >= 1) {
      return clampPeriod(regulation + overtimeIndex)
    }
  }
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  return clampPeriod(Number.parseInt(digits, 10))
}

export function isAwaitingQuarterStart(
  clock: {
    seconds: number
    period: number
  },
  gameStarted = true,
  rulesRef?: RulesetRef,
): boolean {
  return (
    gameStarted &&
    clock.seconds === 0 &&
    clock.period < regulationPeriods(rulesRef)
  )
}

export function isPeriodInProgress(
  gameStarted: boolean,
  gameEnded: boolean,
  clock: { seconds: number; period: number },
  rulesRef?: RulesetRef,
): boolean {
  return (
    gameStarted &&
    !gameEnded &&
    !isAwaitingRegulationDecision(gameStarted, gameEnded, clock, rulesRef) &&
    !isAwaitingQuarterStart(clock, gameStarted, rulesRef) &&
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
  rulesRef?: RulesetRef,
): boolean {
  if (!gameStarted || gameEnded || periodEnded) return false
  if (isOvertimePeriod(clock.period, rulesRef)) return false
  if (isAwaitingRegulationDecision(gameStarted, gameEnded, clock, rulesRef)) {
    return true
  }

  if (clock.seconds === 0) return true

  return !clock.running && clock.seconds > 0
}

/** True when the operator can start overtime after the final regulation period. */
export function canStartOvertime(
  gameStarted: boolean,
  gameEnded: boolean,
  periodEnded: boolean,
  clock: { seconds: number; period: number },
  rulesRef?: RulesetRef,
): boolean {
  return (
    gameStarted &&
    !gameEnded &&
    periodEnded &&
    isAwaitingRegulationDecision(gameStarted, gameEnded, clock, rulesRef)
  )
}

/** True when the operator can start the next regulation period. */
export function canStartNextPeriod(
  gameStarted: boolean,
  gameEnded: boolean,
  periodEnded: boolean,
  clock: { seconds: number; period: number },
  rulesRef?: RulesetRef,
): boolean {
  return (
    gameStarted &&
    !gameEnded &&
    periodEnded &&
    isAwaitingQuarterStart(clock, gameStarted, rulesRef)
  )
}

export function isAwaitingRegulationDecision(
  gameStarted: boolean,
  gameEnded: boolean,
  clock: { seconds: number; period: number },
  rulesRef?: RulesetRef,
): boolean {
  return (
    gameStarted &&
    !gameEnded &&
    clock.seconds === 0 &&
    clock.period === regulationPeriods(rulesRef)
  )
}

export function isOvertimePeriod(
  period: number,
  rulesRef?: RulesetRef,
): boolean {
  return period > regulationPeriods(rulesRef)
}

export function isRegulationComplete(
  clock: {
    seconds: number
    period: number
  },
  rulesRef?: RulesetRef,
): boolean {
  return (
    clock.seconds === 0 && clock.period >= regulationPeriods(rulesRef)
  )
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

/** @deprecated Prefer `rules.clockEditMaxMinutes`. NCAA default. */
export const CLOCK_EDIT_MAX_MINUTES =
  DEFAULT_FOOTBALL_RULESET.clockEditMaxMinutes
export const CLOCK_EDIT_MAX_SECONDS = 59

export function clockToParts(
  totalSeconds: number,
  rulesRef?: RulesetRef,
): {
  minutes: number
  seconds: number
} {
  const maxMinutes = resolveFootballRuleset(rulesRef).clockEditMaxMinutes
  const clamped = Math.max(0, totalSeconds)
  const minutes = Math.min(maxMinutes, Math.floor(clamped / 60))
  const seconds =
    minutes === maxMinutes
      ? 0
      : Math.min(CLOCK_EDIT_MAX_SECONDS, clamped % 60)

  return { minutes, seconds }
}

export function getClockEditSecondValues(
  minutes: number,
  rulesRef?: RulesetRef,
): number[] {
  const maxMinutes = resolveFootballRuleset(rulesRef).clockEditMaxMinutes
  if (minutes >= maxMinutes) return [0]
  return Array.from({ length: CLOCK_EDIT_MAX_SECONDS + 1 }, (_, index) => index)
}

export function clockFromParts(
  minutes: number,
  seconds: number,
  rulesRef?: RulesetRef,
): number {
  const maxMinutes = resolveFootballRuleset(rulesRef).clockEditMaxMinutes
  const clampedMinutes = Math.max(0, Math.min(maxMinutes, minutes))
  const clampedSeconds =
    clampedMinutes === maxMinutes
      ? 0
      : Math.max(0, Math.min(CLOCK_EDIT_MAX_SECONDS, seconds))

  return clampClockSeconds(clampedMinutes * 60 + clampedSeconds, rulesRef)
}
