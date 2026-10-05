/**
 * Exhaustive *product* catalog of American football concepts for NCAA, NFL, and CFL.
 *
 * This is the single source of truth for feature work (UI pickers, action types,
 * validation, docs). It is not a substitute for official rulebooks — enforcement
 * edge cases should still be checked against the current league book.
 *
 * Structure:
 * - scoring.ts          — scoring events
 * - plays.ts            — scrimmage / result play types
 * - turnovers.ts        — turnover vocabulary
 * - specialTeams.ts     — kickoff / punt / FG / convert
 * - penalties.ts        — fouls with typical yardage + league flags
 * - clock.ts            — clock / timeout / period events
 * - situations.ts       — down/distance & situational tags
 */

import type { FootballCode } from '../rulesets'
import { CLOCK_EVENTS, type ClockEventDef } from './clock'
import { PENALTIES, type PenaltyDef } from './penalties'
import { PLAY_TYPES, type PlayTypeDef } from './plays'
import { SCORING_EVENTS, type ScoringEventDef } from './scoring'
import {
  SPECIAL_TEAMS_EVENTS,
  type SpecialTeamsEventDef,
} from './specialTeams'
import { SITUATIONS, type SituationDef } from './situations'
import { TURNOVERS, type TurnoverDef } from './turnovers'
import { filterByLeague, type CatalogEntryBase } from './types'

export * from './types'
export * from './scoring'
export * from './plays'
export * from './turnovers'
export * from './specialTeams'
export * from './penalties'
export * from './clock'
export * from './situations'

export interface FootballCatalogByLeague {
  code: FootballCode
  scoring: ScoringEventDef[]
  plays: PlayTypeDef[]
  turnovers: TurnoverDef[]
  specialTeams: SpecialTeamsEventDef[]
  penalties: PenaltyDef[]
  clock: ClockEventDef[]
  situations: SituationDef[]
}

/** All catalog entries applicable to a league — use when building UI modules. */
export function getFootballCatalogForLeague(
  code: FootballCode,
): FootballCatalogByLeague {
  return {
    code,
    scoring: filterByLeague([...SCORING_EVENTS], code),
    plays: filterByLeague([...PLAY_TYPES], code),
    turnovers: filterByLeague([...TURNOVERS], code),
    specialTeams: filterByLeague([...SPECIAL_TEAMS_EVENTS], code),
    penalties: filterByLeague([...PENALTIES], code),
    clock: filterByLeague([...CLOCK_EVENTS], code),
    situations: filterByLeague([...SITUATIONS], code),
  }
}

/** Flat list of every catalog id (all leagues). Handy for sanity checks. */
export function listAllCatalogIds(): string[] {
  const groups: readonly CatalogEntryBase[][] = [
    [...SCORING_EVENTS],
    [...PLAY_TYPES],
    [...TURNOVERS],
    [...SPECIAL_TEAMS_EVENTS],
    [...PENALTIES],
    [...CLOCK_EVENTS],
    [...SITUATIONS],
  ]
  return groups.flatMap((group) => group.map((entry) => entry.id))
}
