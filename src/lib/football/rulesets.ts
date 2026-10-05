/**
 * League rule packs for American football variants.
 *
 * Pure configuration — helpers read these instead of hardcoding NCAA values.
 * Default for this product is college (`ncaa`).
 */

export type FootballCode = 'ncaa' | 'nfl' | 'cfl'

export interface FootballRuleset {
  id: FootballCode
  /** Human label for settings / docs */
  label: string
  /** Playing field length between goal lines (yards). */
  fieldLengthYards: number
  /** Depth of each end zone (yards). Informational / future scoring. */
  endZoneYards: number
  /** Midfield yard line used for ball-on display (usually fieldLength / 2). */
  midfieldYards: number
  /** Minimum offense-relative ball-on. */
  minBallOn: number
  /** Maximum offense-relative ball-on (fieldLength - 1). */
  maxBallOn: number
  /** First down in a series. */
  minDown: number
  /** Last down before turnover on downs (4 NCAA/NFL, 3 CFL). */
  maxDown: number
  /** Yards needed for a new set of downs. */
  firstDownDistance: number
  /** Clamp ceiling for to-go distance. */
  maxDistance: number
  /** Floor for to-go (goal-to-go displays as 1). */
  minDistance: number
  /** Default ball spot after kickoff / series start in demos. */
  defaultBallOn: number
  /** Regulation period count. */
  regulationPeriods: number
  /** Length of a regulation period in seconds. */
  quarterLengthSeconds: number
  /** Max minutes allowed in the clock editor. */
  clockEditMaxMinutes: number
  /** Touchdown points. */
  touchdownPoints: number
  /** Field goal points. */
  fieldGoalPoints: number
  /** Safety points. */
  safetyPoints: number
  /** One-point convert (kick). */
  conversionKickPoints: number
  /** Two-point convert (play from scrimmage). */
  conversionPlayPoints: number
  /** CFL rouge / single — 0 when not used. */
  rougePoints: number
  /** Whether a missed field goal / kick through the end zone can score a single. */
  hasRouge: boolean
}

const NCAA_RULESET: FootballRuleset = {
  id: 'ncaa',
  label: 'College football (NCAA)',
  fieldLengthYards: 100,
  endZoneYards: 10,
  midfieldYards: 50,
  minBallOn: 1,
  maxBallOn: 99,
  minDown: 1,
  maxDown: 4,
  firstDownDistance: 10,
  minDistance: 1,
  maxDistance: 99,
  defaultBallOn: 25,
  regulationPeriods: 4,
  quarterLengthSeconds: 15 * 60,
  clockEditMaxMinutes: 15,
  touchdownPoints: 6,
  fieldGoalPoints: 3,
  safetyPoints: 2,
  conversionKickPoints: 1,
  conversionPlayPoints: 2,
  rougePoints: 0,
  hasRouge: false,
}

const NFL_RULESET: FootballRuleset = {
  id: 'nfl',
  label: 'NFL',
  fieldLengthYards: 100,
  endZoneYards: 10,
  midfieldYards: 50,
  minBallOn: 1,
  maxBallOn: 99,
  minDown: 1,
  maxDown: 4,
  firstDownDistance: 10,
  minDistance: 1,
  maxDistance: 99,
  defaultBallOn: 25,
  regulationPeriods: 4,
  quarterLengthSeconds: 15 * 60,
  clockEditMaxMinutes: 15,
  touchdownPoints: 6,
  fieldGoalPoints: 3,
  safetyPoints: 2,
  conversionKickPoints: 1,
  conversionPlayPoints: 2,
  rougePoints: 0,
  hasRouge: false,
}

/** Canadian Football League — 110-yard field, 3 downs, rouge. */
const CFL_RULESET: FootballRuleset = {
  id: 'cfl',
  label: 'CFL',
  fieldLengthYards: 110,
  endZoneYards: 20,
  midfieldYards: 55,
  minBallOn: 1,
  maxBallOn: 109,
  minDown: 1,
  maxDown: 3,
  firstDownDistance: 10,
  minDistance: 1,
  maxDistance: 109,
  defaultBallOn: 40,
  regulationPeriods: 4,
  quarterLengthSeconds: 15 * 60,
  clockEditMaxMinutes: 15,
  touchdownPoints: 6,
  fieldGoalPoints: 3,
  safetyPoints: 2,
  conversionKickPoints: 1,
  conversionPlayPoints: 2,
  rougePoints: 1,
  hasRouge: true,
}

export const FOOTBALL_RULESETS: Record<FootballCode, FootballRuleset> = {
  ncaa: NCAA_RULESET,
  nfl: NFL_RULESET,
  cfl: CFL_RULESET,
}

/** Product default — NCAAF data collection. */
export const DEFAULT_FOOTBALL_CODE: FootballCode = 'ncaa'
export const DEFAULT_FOOTBALL_RULESET = FOOTBALL_RULESETS[DEFAULT_FOOTBALL_CODE]

export function isFootballCode(value: unknown): value is FootballCode {
  return value === 'ncaa' || value === 'nfl' || value === 'cfl'
}

export function getFootballRuleset(
  code: FootballCode | null | undefined = DEFAULT_FOOTBALL_CODE,
): FootballRuleset {
  if (code && code in FOOTBALL_RULESETS) {
    return FOOTBALL_RULESETS[code]
  }
  return DEFAULT_FOOTBALL_RULESET
}

export type RulesetRef = FootballCode | FootballRuleset | null | undefined

export function resolveFootballRuleset(ref?: RulesetRef): FootballRuleset {
  if (ref && typeof ref === 'object') return ref
  return getFootballRuleset(ref)
}
