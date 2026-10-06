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
  code: FootballCode,
  seriesKind: SeriesKind,
  category: FlagCategory | null,
): FlagType[] {
  return flagTypesForSeries(code, seriesKind).filter((type) =>
    category ? type.category === category : true,
  )
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

export function flagCategoryOptions(
  code: FootballCode,
  seriesKind: SeriesKind,
): PlayCollectionOption[] {
  const available = new Set(
    flagTypesForSeries(code, seriesKind).map((type) => type.category),
  )
  return CATEGORY_META.filter((entry) => available.has(entry.id)).map((entry) =>
    option({
      id: entry.optionId,
      label: entry.label,
      likelihood: entry.likelihood,
      nextStep: 'choose_flag_type',
    }),
  )
}

export function flagTypeOptions(
  code: FootballCode,
  seriesKind: SeriesKind,
  category: FlagCategory | null,
): PlayCollectionOption[] {
  return typesForContext(code, seriesKind, category)
    .map((type) =>
      option({
        id: type.id,
        label: type.label.toUpperCase(),
        likelihood: TYPE_LIKELIHOOD[type.id] ?? 10,
        nextStep: againstChoices(type, seriesKind).length === 1
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
  code: FootballCode,
  seriesKind: SeriesKind,
): PlayCollectionStepDef | null {
  const parsed = parseFlagCollectionPath(path)
  if (stepId === 'choose_flag_category') {
    return {
      id: stepId,
      label: 'Flag',
      prompt: 'What kind of flag?',
      showYards: true,
      canEndPlay: false,
      options: flagCategoryOptions(code, seriesKind),
    }
  }
  if (stepId === 'choose_flag_type') {
    return {
      id: stepId,
      label: 'Flag type',
      prompt: 'Which flag?',
      showYards: true,
      canEndPlay: false,
      options: flagTypeOptions(code, seriesKind, parsed.category),
    }
  }
  if (stepId === 'choose_flag_against') {
    return {
      id: stepId,
      label: 'Flag against',
      prompt: 'Who is the flag on?',
      showYards: true,
      canEndPlay: false,
      options: flagAgainstOptions(parsed.typeId, seriesKind),
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
  code: FootballCode,
  seriesKind: SeriesKind,
): PlayCollectionButton[] {
  const step = getFlagCollectionStepDef(stepId, path, code, seriesKind)
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
  code: FootballCode,
  seriesKind: SeriesKind,
): {
  nextStep: PlayCollectionStepId | null
  decision: 'accepted' | 'declined' | null
} | null {
  const step = getFlagCollectionStepDef(stepId, path, code, seriesKind)
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
