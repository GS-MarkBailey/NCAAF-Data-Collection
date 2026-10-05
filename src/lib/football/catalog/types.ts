import type { FootballCode } from '../rulesets'

/** Which leagues this catalog entry applies to. */
export type LeagueSet = readonly FootballCode[] | 'all'

export interface CatalogEntryBase {
  /** Stable machine id — use this in UI / action logs / future APIs. */
  id: string
  /** Operator-facing label. */
  label: string
  /** Short definition for docs / tooltips. */
  description: string
  /** Leagues where this concept exists. */
  leagues: LeagueSet
  /** Optional notes on league-specific nuances. */
  notes?: string
}

export function appliesToLeague(
  entry: Pick<CatalogEntryBase, 'leagues'>,
  code: FootballCode,
): boolean {
  return entry.leagues === 'all' || entry.leagues.includes(code)
}

export function filterByLeague<T extends CatalogEntryBase>(
  entries: readonly T[],
  code: FootballCode,
): T[] {
  return entries.filter((entry) => appliesToLeague(entry, code))
}
