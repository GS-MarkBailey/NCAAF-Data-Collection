import type { CatalogEntryBase } from './types'

export interface SpecialTeamsEventDef extends CatalogEntryBase {
  category: 'kickoff' | 'punt' | 'place_kick' | 'return' | 'catch' | 'misc'
}

export const SPECIAL_TEAMS_EVENTS = [
  {
    id: 'st.kickoff',
    label: 'Kickoff',
    description: 'Free kick that starts a half or follows certain scores.',
    leagues: 'all',
    category: 'kickoff',
  },
  {
    id: 'st.kickoff_return',
    label: 'Kickoff return',
    description: 'Receiving team returns a kickoff.',
    leagues: 'all',
    category: 'return',
  },
  {
    id: 'st.kickoff_touchback',
    label: 'Kickoff touchback',
    description: 'Kickoff downed in / through the end zone; ball spotted per league rules.',
    leagues: 'all',
    category: 'kickoff',
    notes: 'Spot differs (e.g. 25 NCAA/NFL common; CFL spots differ).',
  },
  {
    id: 'st.kickoff_out_of_bounds',
    label: 'Kickoff out of bounds',
    description: 'Kickoff goes out of bounds; penalty / spot enforcement by league.',
    leagues: 'all',
    category: 'kickoff',
  },
  {
    id: 'st.onside_kick',
    label: 'Onside kick',
    description: 'Short kickoff intended to be recovered by the kicking team.',
    leagues: 'all',
    category: 'kickoff',
  },
  {
    id: 'st.punt',
    label: 'Punt',
    description: 'Scrimmage kick to surrender field position.',
    leagues: 'all',
    category: 'punt',
  },
  {
    id: 'st.punt_return',
    label: 'Punt return',
    description: 'Receiving team returns a punt.',
    leagues: 'all',
    category: 'return',
  },
  {
    id: 'st.punt_touchback',
    label: 'Punt touchback',
    description: 'Punt downed in the end zone.',
    leagues: 'all',
    category: 'punt',
  },
  {
    id: 'st.fair_catch',
    label: 'Fair catch',
    description: 'Receiver signals fair catch; cannot be tackled if catch is made.',
    leagues: ['ncaa', 'nfl'],
    category: 'catch',
    notes: 'CFL has no fair catch — uses no-yards rule instead.',
  },
  {
    id: 'st.fair_catch_interference',
    label: 'Fair catch interference',
    description: 'Contact with a receiver who has signaled for a fair catch.',
    leagues: ['ncaa', 'nfl'],
    category: 'catch',
  },
  {
    id: 'st.no_yards',
    label: 'No yards',
    description:
      'Kicking-team player enters the 5-yard halo around a receiver attempting to field a kick (CFL).',
    leagues: ['cfl'],
    category: 'catch',
    notes: 'Replaces fair-catch protection; yardage 5 or 15 depending on situation.',
  },
  {
    id: 'st.field_goal_attempt',
    label: 'Field goal attempt',
    description: 'Place / drop kick attempt at three points.',
    leagues: 'all',
    category: 'place_kick',
  },
  {
    id: 'st.field_goal_missed',
    label: 'Missed field goal',
    description: 'Field goal attempt unsuccessful; next spot / rouge rules by league.',
    leagues: 'all',
    category: 'place_kick',
  },
  {
    id: 'st.field_goal_blocked',
    label: 'Blocked field goal',
    description: 'Defense blocks a field goal attempt.',
    leagues: 'all',
    category: 'place_kick',
  },
  {
    id: 'st.punt_blocked',
    label: 'Blocked punt',
    description: 'Defense blocks a punt.',
    leagues: 'all',
    category: 'punt',
  },
  {
    id: 'st.extra_point_attempt',
    label: 'Extra-point / convert attempt',
    description: 'Try after touchdown (kick or play).',
    leagues: 'all',
    category: 'place_kick',
  },
  {
    id: 'st.extra_point_missed',
    label: 'Missed extra point',
    description: 'Unsuccessful kick try.',
    leagues: 'all',
    category: 'place_kick',
  },
  {
    id: 'st.extra_point_blocked',
    label: 'Blocked extra point',
    description: 'Defense blocks the try kick.',
    leagues: 'all',
    category: 'place_kick',
  },
  {
    id: 'st.free_kick_after_safety',
    label: 'Free kick after safety',
    description: 'Kick that puts the ball in play after a safety.',
    leagues: 'all',
    category: 'kickoff',
  },
] as const satisfies readonly SpecialTeamsEventDef[]

export type SpecialTeamsEventId = (typeof SPECIAL_TEAMS_EVENTS)[number]['id']
