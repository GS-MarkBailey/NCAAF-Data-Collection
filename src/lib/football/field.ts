import { clampBallOn } from './ballOn'
import {
  resolveFootballRuleset,
  type RulesetRef,
} from './rulesets'

/** Format offense-relative ball-on for play-by-play (e.g. "CONC 25"). */
export function formatBallOn(
  offenseIsHome: boolean,
  yardsFromOwnGoal: number,
  homeAbbr: string,
  awayAbbr: string,
  rulesRef?: RulesetRef,
): string {
  const rules = resolveFootballRuleset(rulesRef)
  const yards = clampBallOn(yardsFromOwnGoal, rules)
  if (yards <= rules.midfieldYards) {
    return `${offenseIsHome ? homeAbbr : awayAbbr} ${yards}`
  }
  const oppYards = rules.fieldLengthYards - yards
  return `${offenseIsHome ? awayAbbr : homeAbbr} ${oppYards}`
}

export type BallOnArrowSide = 'left' | 'right'

export interface BallOnDisplay {
  yardLine: number
  arrowSide: BallOnArrowSide
}

/** Convert offense-relative ball position to yards from the home goal line. */
export function yardsFromHomeGoal(
  yardsFromOwnGoal: number,
  offenseIsHome: boolean,
  rulesRef?: RulesetRef,
): number {
  const rules = resolveFootballRuleset(rulesRef)
  const yards = clampBallOn(yardsFromOwnGoal, rules)
  return offenseIsHome ? yards : rules.fieldLengthYards - yards
}

/**
 * End-of-quarter switches that flip displayed field direction.
 * Teams switch after Q1 and Q3; they stay on the same end through halftime (Q2→Q3).
 */
export function endSwitchCount(period: number): number {
  if (period <= 1) return 0
  if (period <= 3) return 1
  return 2
}

/** Q1 base direction adjusted for end-of-quarter switches. */
export function getEffectiveHomeAttacksRight(
  homeAttacksRight: boolean,
  period: number,
): boolean {
  return endSwitchCount(period) % 2 === 1 ? !homeAttacksRight : homeAttacksRight
}

/** Yard line (1–midfield) and attack-direction arrow from yards-from-home-goal. */
export function getBallOnDisplay(
  yardsFromHomeGoalValue: number,
  homeAttacksRight: boolean,
  rulesRef?: RulesetRef,
): BallOnDisplay {
  const rules = resolveFootballRuleset(rulesRef)
  const yards = clampBallOn(yardsFromHomeGoalValue, rules)
  const onHomeSide = yards <= rules.midfieldYards
  const homeSideArrow: BallOnArrowSide = homeAttacksRight ? 'right' : 'left'
  const awaySideArrow: BallOnArrowSide = homeAttacksRight ? 'left' : 'right'

  return {
    yardLine: onHomeSide ? yards : rules.fieldLengthYards - yards,
    arrowSide: onHomeSide ? homeSideArrow : awaySideArrow,
  }
}

/** Display yard line (1–midfield) from offense-relative field position. */
export function getBallOnYardLine(
  yardsFromOwnGoal: number,
  rulesRef?: RulesetRef,
): number {
  const rules = resolveFootballRuleset(rulesRef)
  const yards = clampBallOn(yardsFromOwnGoal, rules)
  return yards <= rules.midfieldYards
    ? yards
    : rules.fieldLengthYards - yards
}
