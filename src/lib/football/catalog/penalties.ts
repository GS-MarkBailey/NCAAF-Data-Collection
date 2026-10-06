import type { FootballCode } from '../rulesets'
import {
  FLAG_TYPES,
  getAssociationFlagRule,
  type DownEffect,
  type FlagType,
  type YardageSpec,
} from '../flagRules'
import type { CatalogEntryBase, LeagueSet } from './types'

export type PenaltyYardage =
  | 5
  | 10
  | 15
  | 'spot'
  | 'half_distance'
  | 'loss_of_down'
  | 'disqualification'
  | 'varies'

export interface PenaltyDef extends CatalogEntryBase {
  category:
    | 'pre_snap'
    | 'line'
    | 'pass'
    | 'personal'
    | 'unsportsmanlike'
    | 'kick'
    | 'substitution'
    | 'clock'
    | 'other'
  /** Typical enforcement distance / type — prefer `flagRules` per association. */
  yardage: PenaltyYardage
  /** Often awarded automatic first down when accepted. */
  automaticFirstDown?: boolean
  /** May include ejection / targeting disqualification. */
  canDisqualify?: boolean
  /** Canonical game-layer flag id (`flag.*`). */
  flagTypeId: FlagType['id']
}

function catalogIdForFlag(type: FlagType): string {
  return `penalty.${type.id.slice('flag.'.length)}`
}

function leaguesForFlag(type: FlagType): LeagueSet {
  const codes = (['ncaa', 'nfl', 'cfl'] as const).filter(
    (code) => type.associations[code].applies,
  )
  if (codes.length === 3) return 'all'
  return codes
}

function typicalYardage(type: FlagType): PenaltyYardage {
  const preferred: FootballCode[] = ['ncaa', 'nfl', 'cfl']
  for (const code of preferred) {
    const rule = getAssociationFlagRule(type, code)
    if (!rule) continue
    return yardageSpecToCatalog(rule.yardage, rule.downEffect)
  }
  return 'varies'
}

function yardageSpecToCatalog(
  spec: YardageSpec,
  downEffect: DownEffect,
): PenaltyYardage {
  if (downEffect === 'loss_of_down' && spec.kind !== 'fixed') {
    return 'loss_of_down'
  }
  switch (spec.kind) {
    case 'fixed':
      return spec.yards
    case 'spot_foul':
    case 'spot_foul_end_zone':
      return 'spot'
    default:
      return 'varies'
  }
}

function notesForFlag(type: FlagType): string | undefined {
  const bits: string[] = []
  for (const code of ['ncaa', 'nfl', 'cfl'] as const) {
    const entry = type.associations[code]
    if (entry.notes) bits.push(`${code.toUpperCase()}: ${entry.notes}`)
  }
  return bits.length > 0 ? bits.join(' ') : undefined
}

function penaltyFromFlag(type: FlagType): PenaltyDef {
  const preferred: FootballCode[] = ['ncaa', 'nfl', 'cfl']
  let automaticFirstDown = false
  let canDisqualify = false
  for (const code of preferred) {
    const rule = getAssociationFlagRule(type, code)
    if (!rule) continue
    if (rule.downEffect === 'automatic_first_down') automaticFirstDown = true
    if (rule.canDisqualify) canDisqualify = true
  }
  return {
    id: catalogIdForFlag(type),
    flagTypeId: type.id,
    label: type.label,
    description: type.description,
    category: type.category,
    yardage: typicalYardage(type),
    leagues: leaguesForFlag(type),
    notes: notesForFlag(type),
    ...(automaticFirstDown ? { automaticFirstDown: true } : {}),
    ...(canDisqualify ? { canDisqualify: true } : {}),
  }
}

/**
 * Operator-facing penalty catalog across NCAA, NFL, and CFL.
 *
 * Derived from `flagRules.ts` — association-specific enforcement lives there.
 * Official books still win on edge cases.
 */
export const PENALTIES: readonly PenaltyDef[] = FLAG_TYPES.map(penaltyFromFlag)

export type PenaltyId = (typeof PENALTIES)[number]['id']
