/**
 * Flag collection steps for play controls.
 * Types and enforcement are association-specific (`flagRules` / `flagEnforcement`).
 */

import type { SeriesKind } from '@/types'
import {
  flagTypesForSeries,
  getFlagType,
  isFlagTypeId,
  type FlagAgainst,
  type FlagCategory,
  type FlagType,
  type FlagTypeId,
} from './flagRules'
import type { FootballCode } from './rulesets'
import type {
  PlayCollectionButton,
  PlayCollectionOption,
  PlayCollectionStepDef,
  PlayCollectionStepId,
} from './playCollectionFlow'
import { emphasisForLikelihood } from './playCollectionFlow'

export const FLAG_COLLECTION_STEPS: readonly PlayCollectionStepId[] = [
  'choose_flag_category',
  'choose_flag_type',
  'choose_flag_against',
  'choose_flag_decision',
]

export function isFlagCollectionStep(
  stepId: PlayCollectionStepId | null | undefined,
): boolean {
  return (
    stepId === 'choose_flag_category' ||
    stepId === 'choose_flag_type' ||
    stepId === 'choose_flag_against' ||
    stepId === 'choose_flag_decision'
  )
}

export const FLAG_PATH_KEY = 'flag'

export type FlagSituation =
  | 'pre_snap'
  | 'kickoff'
  | 'try'
  | 'try_kick'
  | 'run'
  | 'pass'
  | 'punt'
  | 'live'

export interface FlagMatchContext {
  rulesetId: FootballCode
  seriesKind: SeriesKind
  playInProgress: boolean
  /** Play-tree path *before* FLAG was opened. */
  collectionPath: readonly string[]
}

const CATEGORIES_BY_SITUATION: Record<FlagSituation, readonly FlagCategory[]> = {
  pre_snap: ['pre_snap', 'clock', 'substitution', 'unsportsmanlike', 'other'],
  kickoff: ['kick', 'personal', 'unsportsmanlike', 'pre_snap', 'substitution', 'other'],
  try: ['pre_snap', 'clock', 'kick', 'pass', 'line', 'personal', 'unsportsmanlike'],
  try_kick: ['kick', 'personal', 'unsportsmanlike', 'substitution', 'clock'],
  run: ['line', 'personal', 'unsportsmanlike', 'other', 'substitution'],
  pass: ['pass', 'line', 'personal', 'unsportsmanlike', 'other'],
  punt: ['kick', 'line', 'personal', 'unsportsmanlike', 'other'],
  live: ['line', 'pass', 'personal', 'kick', 'unsportsmanlike', 'other', 'substitution'],
}

const PRE_SNAP_ONLY_IDS = new Set<FlagTypeId>([
  'flag.false_start',
  'flag.illegal_procedure',
  'flag.encroachment',
  'flag.neutral_zone_infraction',
  'flag.delay_of_game',
  'flag.delay_of_game_defense',
  'flag.time_count',
  'flag.illegal_formation',
  'flag.illegal_motion',
  'flag.illegal_shift',
  'flag.illegal_snap',
  'flag.ineligible_number',
  'flag.twelve_men',
])

const PASS_PLAY_IDS = new Set<FlagTypeId>([
  'flag.defensive_pass_interference',
  'flag.offensive_pass_interference',
  'flag.illegal_contact',
  'flag.illegal_contact_receiver',
  'flag.ineligible_downfield',
  'flag.illegal_forward_pass',
  'flag.intentional_grounding',
  'flag.illegal_touching',
  'flag.illegal_forward_handing',
  'flag.roughing_passer',
])

const KICK_PLAY_IDS = new Set<FlagTypeId>([
  'flag.roughing_kicker',
  'flag.running_into_kicker',
  'flag.roughing_snapper',
  'flag.leaping',
  'flag.fair_catch_interference',
  'flag.kick_catch_interference',
  'flag.no_yards',
  'flag.illegally_downfield_on_kick',
  'flag.kickoff_out_of_bounds',
  'flag.illegal_touching_free_kick',
  'flag.free_kick_offside',
  'flag.illegal_wedge',
  'flag.illegal_fair_catch',
])

export function playPathWithoutFlag(path: readonly string[]): string[] {
  const out: string[] = []
  for (const key of path) {
    if (key === FLAG_PATH_KEY || key.startsWith('flag_') || isFlagTypeId(key)) {
      break
    }
    out.push(key)
  }
  return out
}

export function flagMatchContextFromGame(game: {
  rulesetId: FootballCode
  seriesKind: SeriesKind
  playInProgress: boolean
  playCollectionPath: readonly string[]
  flagResume: {
    playInProgress: boolean
    playCollectionPath: readonly string[]
  } | null
}): FlagMatchContext {
  const resume = game.flagResume
  const sourcePath = resume?.playCollectionPath ?? game.playCollectionPath
  return {
    rulesetId: game.rulesetId,
    seriesKind: game.seriesKind,
    playInProgress: resume?.playInProgress ?? game.playInProgress,
    collectionPath: playPathWithoutFlag(sourcePath),
  }
}

export function deriveFlagSituation(ctx: FlagMatchContext): FlagSituation {
  const path = ctx.collectionPath
  if (ctx.seriesKind === 'free_kick' || path.includes('kickoff')) return 'kickoff'
  if (ctx.seriesKind === 'try' || path.includes('try')) {
    if (path.includes('pat_kick')) return 'try_kick'
    if (path.includes('throw')) return 'pass'
    if (path.includes('rush') || path.includes('two_point')) return 'run'
    return 'try'
  }
  if (!ctx.playInProgress) return 'pre_snap'
  if (path.includes('punt')) return 'punt'
  if (path.includes('throw')) return 'pass'
  if (path.includes('rush')) return 'run'
  return 'live'
}

function typeFitsSituation(type: FlagType, situation: FlagSituation): boolean {
  const allowed = CATEGORIES_BY_SITUATION[situation]
  if (!allowed.includes(type.category)) return false

  const id = type.id
  if (PRE_SNAP_ONLY_IDS.has(id)) {
    return situation === 'pre_snap' || situation === 'try'
  }
  if (PASS_PLAY_IDS.has(id)) {
    return situation === 'pass' || situation === 'live' || situation === 'try'
  }
  if (KICK_PLAY_IDS.has(id)) {
    return (
      situation === 'kickoff' ||
      situation === 'punt' ||
      situation === 'try_kick' ||
      situation === 'try' ||
      situation === 'live'
    )
  }
  if (id === 'flag.offside') {
    return (
      situation === 'pre_snap' ||
      situation === 'kickoff' ||
      situation === 'try'
    )
  }
  return true
}

/** Association + series + current phase / play tree. */
export function flagTypesForMatchState(
  ctx: FlagMatchContext,
  category: FlagCategory | null = null,
): FlagType[] {
  const situation = deriveFlagSituation(ctx)
  return flagTypesForSeries(ctx.rulesetId, ctx.seriesKind).filter((type) => {
    if (category && type.category !== category) return false
    return typeFitsSituation(type, situation)
  })
}

const CATEGORY_META: {
  id: FlagCategory
  optionId: string
  label: string
  likelihood: number
}[] = [
  { id: 'pre_snap', optionId: 'flag_cat_pre_snap', label: 'PROCEDURE', likelihood: 70 },
  { id: 'clock', optionId: 'flag_cat_clock', label: 'CLOCK', likelihood: 40 },
  { id: 'line', optionId: 'flag_cat_line', label: 'HOLDING / BLOCK', likelihood: 55 },
  { id: 'pass', optionId: 'flag_cat_pass', label: 'PASS', likelihood: 50 },
  { id: 'personal', optionId: 'flag_cat_personal', label: 'PERSONAL', likelihood: 35 },
  { id: 'kick', optionId: 'flag_cat_kick', label: 'KICK', likelihood: 20 },
  { id: 'unsportsmanlike', optionId: 'flag_cat_unsportsmanlike', label: 'CONDUCT', likelihood: 12 },
  { id: 'substitution', optionId: 'flag_cat_substitution', label: 'SUBSTITUTION', likelihood: 10 },
  { id: 'other', optionId: 'flag_cat_other', label: 'OTHER', likelihood: 5 },
]

const TYPE_LIKELIHOOD: Partial<Record<FlagTypeId, number>> = {
  'flag.false_start': 90,
  'flag.offside': 80,
  'flag.delay_of_game': 70,
  'flag.illegal_formation': 40,
  'flag.illegal_motion': 30,
  'flag.encroachment': 45,
  'flag.neutral_zone_infraction': 40,
  'flag.illegal_procedure': 85,
  'flag.time_count': 70,
  'flag.offensive_holding': 90,
  'flag.defensive_holding': 60,
  'flag.illegal_block_in_back': 35,
  'flag.defensive_pass_interference': 70,
  'flag.offensive_pass_interference': 40,
  'flag.intentional_grounding': 25,
  'flag.ineligible_downfield': 20,
  'flag.unnecessary_roughness': 50,
  'flag.personal_foul': 40,
  'flag.facemask': 35,
  'flag.roughing_passer': 30,
  'flag.targeting': 25,
  'flag.unsportsmanlike': 20,
  'flag.taunting': 15,
  'flag.no_yards': 55,
  'flag.kickoff_out_of_bounds': 40,
  'flag.too_many_men': 25,
}

const AGAINST_LABEL: Record<FlagAgainst, { optionId: string; label: string }> = {
  offense: { optionId: 'flag_offense', label: 'OFFENSE' },
  defense: { optionId: 'flag_defense', label: 'DEFENSE' },
  kicking: { optionId: 'flag_kicking', label: 'KICKING' },
  receiving: { optionId: 'flag_receiving', label: 'RECEIVING' },
  either: { optionId: 'flag_either', label: 'EITHER' },
}

export function categoryFromOptionId(optionId: string): FlagCategory | null {
  return CATEGORY_META.find((entry) => entry.optionId === optionId)?.id ?? null
}

export function againstFromOptionId(optionId: string): FlagAgainst | null {
  const found = (Object.keys(AGAINST_LABEL) as FlagAgainst[]).find(
    (key) => AGAINST_LABEL[key].optionId === optionId,
  )
  return found ?? null
}

export function parseFlagCollectionPath(path: readonly string[]): {
  category: FlagCategory | null
  typeId: FlagTypeId | null
  against: FlagAgainst | null
} {
  let category: FlagCategory | null = null
  let typeId: FlagTypeId | null = null
  let against: FlagAgainst | null = null
  for (const key of path) {
    const cat = categoryFromOptionId(key)
    if (cat) category = cat
    if (isFlagTypeId(key)) typeId = key
    const side = againstFromOptionId(key)
    if (side) against = side
  }
  return { category, typeId, against }
}

function typesForContext(
  ctx: FlagMatchContext,
  category: FlagCategory | null,
): FlagType[] {
  return flagTypesForMatchState(ctx, category)
}

function againstChoices(type: FlagType, seriesKind: SeriesKind): FlagAgainst[] {
  if (type.against === 'either') {
    return seriesKind === 'free_kick' ? ['kicking', 'receiving'] : ['offense', 'defense']
  }
  return [type.against]
}

function option(
  partial: PlayCollectionOption,
): PlayCollectionOption {
  return partial
}

export function flagCategoryOptions(ctx: FlagMatchContext): PlayCollectionOption[] {
  const available = new Set(flagTypesForMatchState(ctx).map((type) => type.category))
  const situation = deriveFlagSituation(ctx)
  return CATEGORY_META.filter((entry) => available.has(entry.id)).map((entry) =>
    option({
      id: entry.optionId,
      label: entry.label,
      likelihood:
        situation === 'pass' && entry.id === 'pass'
          ? 90
          : situation === 'kickoff' && entry.id === 'kick'
            ? 90
            : situation === 'pre_snap' && entry.id === 'pre_snap'
              ? 90
              : situation === 'run' && entry.id === 'line'
                ? 90
                : entry.likelihood,
      nextStep: 'choose_flag_type',
    }),
  )
}

export function flagTypeOptions(
  ctx: FlagMatchContext,
  category: FlagCategory | null,
): PlayCollectionOption[] {
  return typesForContext(ctx, category)
    .map((type) =>
      option({
        id: type.id,
        label: type.label.toUpperCase(),
        likelihood: TYPE_LIKELIHOOD[type.id] ?? 10,
        nextStep: againstChoices(type, ctx.seriesKind).length === 1
          ? 'choose_flag_decision'
          : 'choose_flag_against',
      }),
    )
    .sort((a, b) => b.likelihood - a.likelihood)
}

export function flagAgainstOptions(
  typeId: FlagTypeId | null,
  seriesKind: SeriesKind,
): PlayCollectionOption[] {
  const type = typeId ? getFlagType(typeId) : undefined
  const sides = type
    ? againstChoices(type, seriesKind)
    : seriesKind === 'free_kick'
      ? (['kicking', 'receiving'] as FlagAgainst[])
      : (['offense', 'defense'] as FlagAgainst[])
  return sides.map((side) =>
    option({
      id: AGAINST_LABEL[side].optionId,
      label: AGAINST_LABEL[side].label,
      likelihood: 50,
      nextStep: 'choose_flag_decision',
    }),
  )
}

export function flagDecisionOptions(): PlayCollectionOption[] {
  return [
    option({
      id: 'flag_accept',
      label: 'ACCEPT',
      likelihood: 80,
      nextStep: null,
      canEndPlay: true,
    }),
    option({
      id: 'flag_decline',
      label: 'DECLINE',
      likelihood: 20,
      nextStep: null,
    }),
  ]
}

export function getFlagCollectionStepDef(
  stepId: PlayCollectionStepId,
  path: readonly string[],
  ctx: FlagMatchContext,
): PlayCollectionStepDef | null {
  const parsed = parseFlagCollectionPath(path)
  if (stepId === 'choose_flag_category') {
    return {
      id: stepId,
      label: 'Flag',
      prompt: 'What kind of flag?',
      showYards: true,
      canEndPlay: false,
      options: flagCategoryOptions(ctx),
    }
  }
  if (stepId === 'choose_flag_type') {
    return {
      id: stepId,
      label: 'Flag type',
      prompt: 'Which flag?',
      showYards: true,
      canEndPlay: false,
      options: flagTypeOptions(ctx, parsed.category),
    }
  }
  if (stepId === 'choose_flag_against') {
    return {
      id: stepId,
      label: 'Flag against',
      prompt: 'Who is the flag on?',
      showYards: true,
      canEndPlay: false,
      options: flagAgainstOptions(parsed.typeId, ctx.seriesKind),
    }
  }
  if (stepId === 'choose_flag_decision') {
    return {
      id: stepId,
      label: 'Accept flag',
      prompt: 'Accept or decline?',
      showYards: true,
      canEndPlay: false,
      options: flagDecisionOptions(),
    }
  }
  return null
}

export function flagCollectionButtons(
  stepId: PlayCollectionStepId,
  path: readonly string[],
  ctx: FlagMatchContext,
): PlayCollectionButton[] {
  const step = getFlagCollectionStepDef(stepId, path, ctx)
  if (!step) return []
  const weights = step.options.map((entry) => entry.likelihood)
  return step.options.map((entry) => ({
    id: entry.id,
    label: entry.label,
    likelihood: entry.likelihood,
    emphasis: emphasisForLikelihood(entry.likelihood, weights),
  }))
}

export function resolveFlagCollectionChoice(
  stepId: PlayCollectionStepId,
  optionId: string,
  path: readonly string[],
  ctx: FlagMatchContext,
): {
  nextStep: PlayCollectionStepId | null
  decision: 'accepted' | 'declined' | null
} | null {
  const step = getFlagCollectionStepDef(stepId, path, ctx)
  const chosen = step?.options.find((entry) => entry.id === optionId)
  if (!step || !chosen) return null
  if (optionId === 'flag_accept') {
    return { nextStep: null, decision: 'accepted' }
  }
  if (optionId === 'flag_decline') {
    return { nextStep: null, decision: 'declined' }
  }
  return { nextStep: chosen.nextStep, decision: null }
}

export function againstHomeFromChoice(
  against: FlagAgainst,
  possessionIsHome: boolean,
): boolean {
  if (against === 'offense' || against === 'receiving') return possessionIsHome
  if (against === 'defense' || against === 'kicking') return !possessionIsHome
  return possessionIsHome
}

/** Single-sided fouls skip the against step — infer from the type. */
export function inferredAgainst(typeId: FlagTypeId | null): FlagAgainst | null {
  const type = typeId ? getFlagType(typeId) : undefined
  if (!type || type.against === 'either') return null
  return type.against
}
