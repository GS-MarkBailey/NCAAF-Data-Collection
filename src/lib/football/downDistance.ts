import {
  DEFAULT_FOOTBALL_RULESET,
  resolveFootballRuleset,
  type RulesetRef,
} from './rulesets'

/** @deprecated Prefer `rules.minDown`. NCAA default. */
export const MIN_DOWN = DEFAULT_FOOTBALL_RULESET.minDown
/** @deprecated Prefer `rules.maxDown`. NCAA default. */
export const MAX_DOWN = DEFAULT_FOOTBALL_RULESET.maxDown
/** @deprecated Prefer `rules.minDistance`. NCAA default. */
export const MIN_DISTANCE = DEFAULT_FOOTBALL_RULESET.minDistance
/** @deprecated Prefer `rules.maxDistance`. NCAA default. */
export const MAX_DISTANCE = DEFAULT_FOOTBALL_RULESET.maxDistance
/** @deprecated Prefer `rules.firstDownDistance`. NCAA default. */
export const FIRST_DOWN_DISTANCE = DEFAULT_FOOTBALL_RULESET.firstDownDistance

export function clampDown(down: number, rulesRef?: RulesetRef): number {
  const rules = resolveFootballRuleset(rulesRef)
  if (Number.isNaN(down)) return rules.minDown
  return Math.max(
    rules.minDown,
    Math.min(rules.maxDown, Math.round(down)),
  )
}

export function clampDistance(
  distance: number,
  rulesRef?: RulesetRef,
): number {
  const rules = resolveFootballRuleset(rulesRef)
  if (Number.isNaN(distance)) return rules.minDistance
  return Math.max(
    rules.minDistance,
    Math.min(rules.maxDistance, Math.round(distance)),
  )
}

export function parseDownInput(
  raw: string,
  rulesRef?: RulesetRef,
): number | null {
  const digits = raw.trim().replace(/\D/g, '')
  if (!digits) return null
  return clampDown(Number.parseInt(digits, 10), rulesRef)
}

export function parseDistanceInput(
  raw: string,
  rulesRef?: RulesetRef,
): number | null {
  const rules = resolveFootballRuleset(rulesRef)
  const trimmed = raw.trim().toUpperCase()
  if (trimmed === 'G' || trimmed === 'GOAL') return rules.minDistance
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  return clampDistance(Number.parseInt(digits, 10), rules)
}
