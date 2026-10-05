import {
  DEFAULT_FOOTBALL_RULESET,
  resolveFootballRuleset,
  type RulesetRef,
} from './rulesets'

/** @deprecated Prefer `rules.minBallOn` from a ruleset. NCAA default. */
export const MIN_BALL_ON = DEFAULT_FOOTBALL_RULESET.minBallOn
/** @deprecated Prefer `rules.maxBallOn` from a ruleset. NCAA default. */
export const MAX_BALL_ON = DEFAULT_FOOTBALL_RULESET.maxBallOn

export function clampBallOn(
  ballOn: number,
  rulesRef?: RulesetRef,
): number {
  const rules = resolveFootballRuleset(rulesRef)
  if (Number.isNaN(ballOn)) return rules.minBallOn
  return Math.max(
    rules.minBallOn,
    Math.min(rules.maxBallOn, Math.round(ballOn)),
  )
}

/** Apply an offense yard gain/loss to ball-on and distance-to-go. */
export function applyYardDelta(params: {
  ballOn: number
  distance: number
  delta: number
  rules?: RulesetRef
}): { ballOn: number; distance: number } {
  const rules = resolveFootballRuleset(params.rules)
  const nextBallOn = clampBallOn(params.ballOn + params.delta, rules)
  const actualDelta = nextBallOn - params.ballOn
  const nextDistance = Math.max(
    rules.minDistance,
    params.distance - actualDelta,
  )
  return { ballOn: nextBallOn, distance: nextDistance }
}
