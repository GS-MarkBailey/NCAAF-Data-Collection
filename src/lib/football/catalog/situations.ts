import type { CatalogEntryBase } from './types'

/**
 * Down/distance / field situations useful for UI enablement and validation.
 */
export interface SituationDef extends CatalogEntryBase {
  category: 'series' | 'red_zone' | 'kick' | 'try' | 'misc'
}

export const SITUATIONS = [
  {
    id: 'situation.first_and_ten',
    label: '1st & 10',
    description: 'New series after first down or change of possession.',
    leagues: 'all',
    category: 'series',
  },
  {
    id: 'situation.goal_to_go',
    label: 'Goal to go',
    description: 'First-down line is the goal line (distance ≤ yards to goal).',
    leagues: 'all',
    category: 'series',
  },
  {
    id: 'situation.third_down',
    label: '3rd down',
    description: 'Third-down scrimmage (critical in CFL as last down).',
    leagues: 'all',
    category: 'series',
  },
  {
    id: 'situation.fourth_down',
    label: '4th down',
    description: 'Fourth-down scrimmage (NCAA/NFL last down).',
    leagues: ['ncaa', 'nfl'],
    category: 'series',
  },
  {
    id: 'situation.red_zone',
    label: 'Red zone',
    description: 'Ball inside the opponent’s 20-yard line.',
    leagues: 'all',
    category: 'red_zone',
  },
  {
    id: 'situation.inside_five',
    label: 'Inside the 5',
    description: 'Ball at or inside the opponent’s 5-yard line.',
    leagues: 'all',
    category: 'red_zone',
  },
  {
    id: 'situation.two_point_try',
    label: 'Two-point try situation',
    description: 'Offense elects a scrimmage convert after a touchdown.',
    leagues: 'all',
    category: 'try',
  },
  {
    id: 'situation.kick_try',
    label: 'Kick try situation',
    description: 'Offense elects a kicking convert after a touchdown.',
    leagues: 'all',
    category: 'try',
  },
  {
    id: 'situation.free_kick',
    label: 'Free kick situation',
    description: 'Ball next put in play by free kick (kickoff / after safety).',
    leagues: 'all',
    category: 'kick',
  },
  {
    id: 'situation.scrimmage_kick',
    label: 'Scrimmage kick situation',
    description: 'Expected punt or field-goal attempt from scrimmage.',
    leagues: 'all',
    category: 'kick',
  },
  {
    id: 'situation.kneel_out',
    label: 'Kneel-out / victory',
    description: 'Offense running out the clock with kneels.',
    leagues: 'all',
    category: 'misc',
  },
  {
    id: 'situation.hail_mary',
    label: 'Hail Mary',
    description: 'Desperation deep pass near end of half/game.',
    leagues: 'all',
    category: 'misc',
  },
] as const satisfies readonly SituationDef[]

export type SituationId = (typeof SITUATIONS)[number]['id']
