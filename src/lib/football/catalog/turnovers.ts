import type { CatalogEntryBase } from './types'

export interface TurnoverDef extends CatalogEntryBase {
  category: 'pass' | 'fumble' | 'downs' | 'other'
  /** Typically flips possession. */
  changesPossession: boolean
}

export const TURNOVERS = [
  {
    id: 'turnover.interception',
    label: 'Interception',
    description: 'Defense catches a forward pass; possession changes.',
    leagues: 'all',
    category: 'pass',
    changesPossession: true,
  },
  {
    id: 'turnover.interception_touchback',
    label: 'Interception — touchback',
    description: 'Intercepted pass downed in the defense’s end zone.',
    leagues: ['ncaa', 'nfl'],
    category: 'pass',
    changesPossession: true,
  },
  {
    id: 'turnover.fumble_lost',
    label: 'Fumble lost',
    description: 'Offense loses the ball; opponent recovers.',
    leagues: 'all',
    category: 'fumble',
    changesPossession: true,
  },
  {
    id: 'turnover.fumble_recovered_own',
    label: 'Fumble recovered (own)',
    description: 'Fumble recovered by the team that fumbled — not a turnover.',
    leagues: 'all',
    category: 'fumble',
    changesPossession: false,
  },
  {
    id: 'turnover.muff',
    label: 'Muff',
    description:
      'Receiving team fails to secure a kick/punt; kicking team may recover (rules vary on advance).',
    leagues: 'all',
    category: 'other',
    changesPossession: true,
    notes: 'Whether the recovering kicking team may advance differs by league/situation.',
  },
  {
    id: 'turnover.on_downs',
    label: 'Turnover on downs',
    description: 'Failure to convert on last down; defense takes over at the spot.',
    leagues: 'all',
    category: 'downs',
    changesPossession: true,
  },
  {
    id: 'turnover.failed_fourth_down',
    label: 'Failed 4th down',
    description: 'NCAA/NFL label for turnover on downs after an unsuccessful 4th-down try.',
    leagues: ['ncaa', 'nfl'],
    category: 'downs',
    changesPossession: true,
  },
  {
    id: 'turnover.failed_third_down',
    label: 'Failed 3rd down (CFL)',
    description: 'CFL turnover on downs after an unsuccessful 3rd-down try.',
    leagues: ['cfl'],
    category: 'downs',
    changesPossession: true,
  },
] as const satisfies readonly TurnoverDef[]

export type TurnoverId = (typeof TURNOVERS)[number]['id']
