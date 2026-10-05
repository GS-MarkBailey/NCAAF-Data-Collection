import { clampBallOn } from './ballOn'
import {
  DEFAULT_FOOTBALL_RULESET,
  resolveFootballRuleset,
  type RulesetRef,
} from './rulesets'

/** @deprecated Prefer `rules.fieldLengthYards`. NCAA default. */
export const FIELD_LENGTH_YARDS = DEFAULT_FOOTBALL_RULESET.fieldLengthYards

/**
 * `ballOn` is yards from the *offense’s* own goal.
 * Absolute yards are measured from the home team’s goal.
 */
export function toAbsoluteYards(
  possessionIsHome: boolean,
  ballOn: number,
  rulesRef?: RulesetRef,
): number {
  const fieldLength = resolveFootballRuleset(rulesRef).fieldLengthYards
  return possessionIsHome ? ballOn : fieldLength - ballOn
}

export function toOffenseBallOn(
  possessionIsHome: boolean,
  absoluteYards: number,
  rulesRef?: RulesetRef,
): number {
  const rules = resolveFootballRuleset(rulesRef)
  return clampBallOn(
    possessionIsHome
      ? absoluteYards
      : rules.fieldLengthYards - absoluteYards,
    rules,
  )
}

/** Flip possession while keeping the ball at the same absolute field spot. */
export function flipPossessionAtSpot(params: {
  possessionIsHome: boolean
  ballOn: number
  rules?: RulesetRef
}): { possessionIsHome: boolean; ballOn: number } {
  const rules = resolveFootballRuleset(params.rules)
  const absoluteYards = toAbsoluteYards(
    params.possessionIsHome,
    params.ballOn,
    rules,
  )
  const possessionIsHome = !params.possessionIsHome
  return {
    possessionIsHome,
    ballOn: toOffenseBallOn(possessionIsHome, absoluteYards, rules),
  }
}

/** Re-express ball-on for a new offense without moving the ball on the field. */
export function ballOnForPossession(params: {
  currentPossessionIsHome: boolean
  nextPossessionIsHome: boolean
  ballOn: number
  rules?: RulesetRef
}): number {
  const rules = resolveFootballRuleset(params.rules)
  if (params.currentPossessionIsHome === params.nextPossessionIsHome) {
    return clampBallOn(params.ballOn, rules)
  }
  const absoluteYards = toAbsoluteYards(
    params.currentPossessionIsHome,
    params.ballOn,
    rules,
  )
  return toOffenseBallOn(params.nextPossessionIsHome, absoluteYards, rules)
}
