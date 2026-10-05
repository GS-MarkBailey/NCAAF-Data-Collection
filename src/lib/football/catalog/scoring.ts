import type { CatalogEntryBase } from './types'

/**
 * Scoring events — points come from `FootballRuleset` where applicable.
 * This catalog is the vocabulary; rulesets supply numeric values.
 */
export interface ScoringEventDef extends CatalogEntryBase {
  category: 'touchdown' | 'convert' | 'kick' | 'defensive' | 'other'
  /** Typical points; confirm via ruleset for the active league. */
  defaultPoints: number
  /** How the ball is next put in play (high-level). */
  nextPossessionHint?: string
}

export const SCORING_EVENTS = [
  {
    id: 'score.touchdown',
    label: 'Touchdown',
    description:
      'Ball legally possessed in the opponent’s end zone, or crosses the goal line in player possession.',
    leagues: 'all',
    category: 'touchdown',
    defaultPoints: 6,
    nextPossessionHint: 'Try / convert attempt by scoring team',
  },
  {
    id: 'score.field_goal',
    label: 'Field goal',
    description: 'Place kick or drop kick through the uprights during a scrimmage kick.',
    leagues: 'all',
    category: 'kick',
    defaultPoints: 3,
    nextPossessionHint: 'Kickoff by scoring team (league-specific spot)',
  },
  {
    id: 'score.safety',
    label: 'Safety',
    description:
      'Ball becomes dead in the offense’s own end zone with the offense responsible, or foul in own end zone.',
    leagues: 'all',
    category: 'defensive',
    defaultPoints: 2,
    nextPossessionHint: 'Free kick by team that conceded the safety',
    notes: 'CFL term is often “safety touch”.',
  },
  {
    id: 'score.conversion_kick',
    label: 'Convert kick (1-point)',
    description: 'Place kick try after a touchdown.',
    leagues: 'all',
    category: 'convert',
    defaultPoints: 1,
    notes: 'NFL/NCAA: typically from +15 / +3 hash variations by era; CFL convert distances differ.',
  },
  {
    id: 'score.conversion_play',
    label: 'Two-point convert',
    description: 'Scrimmage play from try spot that reaches the end zone.',
    leagues: 'all',
    category: 'convert',
    defaultPoints: 2,
  },
  {
    id: 'score.defensive_conversion',
    label: 'Defensive conversion (2-point)',
    description:
      'Defense scores on a try/convert by returning an interception or fumble to the end zone.',
    leagues: ['ncaa', 'nfl'],
    category: 'defensive',
    defaultPoints: 2,
    notes: 'Not a CFL feature in the same form.',
  },
  {
    id: 'score.rouge',
    label: 'Rouge / single',
    description:
      'Kicked ball enters the goal area and the receiving team fails to advance it out (or related CFL kick-dead cases).',
    leagues: ['cfl'],
    category: 'other',
    defaultPoints: 1,
    nextPossessionHint: 'Scrimmage by team scored against (often own 40)',
    notes:
      'Rule details evolve (e.g. when a kick out the back of the end zone counts). Always check current CFL book.',
  },
  {
    id: 'score.one_point_safety',
    label: 'One-point safety (rare)',
    description:
      'Safety awarded to the offense on a try/convert when the defense is responsible in its end zone (league-specific).',
    leagues: ['ncaa', 'nfl'],
    category: 'other',
    defaultPoints: 1,
    notes: 'Extremely rare; keep for completeness.',
  },
] as const satisfies readonly ScoringEventDef[]

export type ScoringEventId = (typeof SCORING_EVENTS)[number]['id']
