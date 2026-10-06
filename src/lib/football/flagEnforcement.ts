/**
 * Apply an accepted flag using the association rule for the game's ruleset.
 * Operator spotting (current ball-on) is the foul spot when the book is a spot foul.
 */

import { clampBallOn } from './ballOn'
import { clampDistance, clampDown } from './downDistance'
import {
  getAssociationFlagRuleById,
  getFlagType,
  summarizeYardage,
  type AssociationFlagRule,
  type FlagAgainst,
  type FlagTypeId,
  type YardageSpec,
} from './flagRules'
import { distanceForNewSeries } from './play'
import { getFootballRuleset, type FootballCode } from './rulesets'
import type { SeriesKind } from '@/types'

export interface FlagEnforcementInput {
  typeId: FlagTypeId
  against: FlagAgainst
  againstHome: boolean
  ballOn: number
  down: number
  distance: number
  possessionIsHome: boolean
  playStartBallOn: number
  playStartDistance: number
  seriesKind: SeriesKind
  rulesetId: FootballCode
  playInProgress: boolean
}

export interface FlagEnforcementResult {
  ballOn: number
  down: number
  distance: number
  possessionIsHome: boolean
  nextSeries: SeriesKind
  stopClock: boolean
  safetyDefenseIsHome: boolean
  scoredSafety: boolean
  summary: string
}

function typicalYardsForVaries(spec: YardageSpec, categoryHint: string): number {
  if (spec.kind === 'fixed') return spec.yards
  if (categoryHint === 'personal' || categoryHint === 'unsportsmanlike') {
    return 15
  }
  if (categoryHint === 'kick') return 15
  return 5
}

function resolveFixedYards(
  rule: AssociationFlagRule,
  remainingToGoal: number,
  category: string,
): number {
  const spec = rule.yardage
  let yards = typicalYardsForVaries(spec, category)
  if (spec.kind === 'fixed') yards = spec.yards
  if (spec.kind === 'spot_foul' || spec.kind === 'spot_foul_end_zone') {
    return 0
  }
  if (rule.halfDistanceToGoal && remainingToGoal > 0 && yards >= remainingToGoal) {
    return Math.max(1, Math.floor(remainingToGoal / 2))
  }
  return yards
}

function fouledTeamHasBall(
  _against: FlagAgainst,
  possessionIsHome: boolean,
  againstHome: boolean,
): boolean {
  return againstHome === possessionIsHome
}

function resolveDownEffect(
  rule: AssociationFlagRule,
  fouledHasBall: boolean,
): AssociationFlagRule['downEffect'] {
  if (rule.downEffect !== 'varies') return rule.downEffect
  // Personal / UR-style: automatic first down if the defense fouled.
  return fouledHasBall ? 'none' : 'automatic_first_down'
}

export function enforceAcceptedFlag(
  input: FlagEnforcementInput,
): FlagEnforcementResult | null {
  const type = getFlagType(input.typeId)
  const rule = getAssociationFlagRuleById(input.typeId, input.rulesetId)
  if (!type || !rule) return null

  const rules = getFootballRuleset(input.rulesetId)
  const previousBallOn = input.playInProgress
    ? input.playStartBallOn
    : input.ballOn
  const spotBallOn = input.ballOn
  const fouledHasBall = fouledTeamHasBall(
    input.against,
    input.possessionIsHome,
    input.againstHome,
  )

  let fromBallOn = previousBallOn
  if (
    rule.from === 'spot_of_foul' ||
    rule.from === 'succeeding' ||
    rule.from === 'end_of_run' ||
    rule.from === 'behind_los_previous_else_spot'
  ) {
    fromBallOn =
      rule.from === 'behind_los_previous_else_spot' &&
      spotBallOn <= previousBallOn
        ? previousBallOn
        : spotBallOn
  } else if (rule.from === 'pocket_or_spot') {
    fromBallOn = spotBallOn
  }

  const towardGoal = !fouledHasBall
  const remainingToGoal = towardGoal
    ? Math.max(0, rules.fieldLengthYards - fromBallOn)
    : Math.max(0, fromBallOn - rules.minBallOn)

  const yards = resolveFixedYards(rule, remainingToGoal, type.category)
  const signed = towardGoal ? yards : -yards
  let nextBallOn = clampBallOn(fromBallOn + signed, rules)

  if (rule.yardage.kind === 'spot_foul_end_zone') {
    const nearGoal = towardGoal
      ? fromBallOn >= rules.fieldLengthYards - 1
      : fromBallOn <= rules.minBallOn
    if (nearGoal) {
      nextBallOn = clampBallOn(rule.yardage.ballOn, rules)
    } else if (yards === 0) {
      nextBallOn = clampBallOn(fromBallOn, rules)
    }
  } else if (rule.yardage.kind === 'spot_foul') {
    nextBallOn = clampBallOn(fromBallOn, rules)
  }

  const scoredSafety =
    Boolean(rule.safetyIfInOwnEndZone) &&
    fouledHasBall &&
    fromBallOn + signed < rules.minBallOn

  let possessionIsHome = input.possessionIsHome
  let nextSeries: SeriesKind = 'scrimmage'
  let down = input.down
  let distance = input.distance
  const effect = resolveDownEffect(rule, fouledHasBall)
  const sticksAt = input.playInProgress
    ? input.playStartBallOn + input.playStartDistance
    : input.ballOn + input.distance

  if (scoredSafety) {
    nextBallOn = 20
    nextSeries = 'free_kick'
    down = rules.minDown
    distance = rules.firstDownDistance
    possessionIsHome = input.againstHome
  } else if (input.seriesKind === 'try') {
    nextSeries = 'try'
    nextBallOn = 3
    down = rules.minDown
    distance = rules.minDistance
  } else if (effect === 'automatic_first_down') {
    down = rules.minDown
    distance = distanceForNewSeries(nextBallOn, rules)
    nextSeries = 'scrimmage'
  } else if (effect === 'loss_of_down') {
    const nextDown = input.down + 1
    if (nextDown > rules.maxDown) {
      possessionIsHome = !input.possessionIsHome
      nextBallOn = clampBallOn(rules.fieldLengthYards - nextBallOn, rules)
      down = rules.minDown
      distance = distanceForNewSeries(nextBallOn, rules)
    } else {
      down = clampDown(nextDown, rules)
      distance = clampDistance(
        Math.max(rules.minDistance, sticksAt - nextBallOn),
        rules,
      )
    }
    nextSeries = 'scrimmage'
  } else if (effect === 'replay') {
    down = input.down
    distance = clampDistance(
      Math.max(rules.minDistance, sticksAt - nextBallOn),
      rules,
    )
    nextSeries =
      input.seriesKind === 'free_kick' && rule.typicallyDeadBall
        ? 'free_kick'
        : 'scrimmage'
  } else {
    const toGo = sticksAt - nextBallOn
    if (toGo <= 0) {
      down = rules.minDown
      distance = distanceForNewSeries(nextBallOn, rules)
    } else {
      down = clampDown(input.down, rules)
      distance = clampDistance(toGo, rules)
    }
    nextSeries = 'scrimmage'
  }

  const yardLabel = summarizeYardage(rule.yardage)
  const summary = `${type.label} — ${yardLabel}`

  return {
    ballOn: nextBallOn,
    down,
    distance,
    possessionIsHome,
    nextSeries,
    stopClock: true,
    safetyDefenseIsHome: scoredSafety ? !input.againstHome : false,
    scoredSafety,
    summary,
  }
}
