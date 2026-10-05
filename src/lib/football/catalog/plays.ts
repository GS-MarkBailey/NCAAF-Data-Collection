import type { CatalogEntryBase } from './types'

/**
 * Live-play / scrimmage outcome vocabulary for operator collection & PBP.
 * Not every official statistical category — focused on match-state transitions.
 */
export interface PlayTypeDef extends CatalogEntryBase {
  category:
    | 'run'
    | 'pass'
    | 'qb'
    | 'result'
    | 'clock_management'
    | 'no_play'
  /** Typically advances offense relative ball-on when successful. */
  advancesBall?: boolean
}

export const PLAY_TYPES = [
  {
    id: 'play.rush',
    label: 'Rush / run',
    description: 'Ball carrier advances behind or beyond the line via run.',
    leagues: 'all',
    category: 'run',
    advancesBall: true,
  },
  {
    id: 'play.rush_no_gain',
    label: 'Rush — no gain',
    description: 'Run play with zero yards.',
    leagues: 'all',
    category: 'run',
    advancesBall: false,
  },
  {
    id: 'play.rush_loss',
    label: 'Rush — loss',
    description: 'Run play resulting in negative yards (not a sack).',
    leagues: 'all',
    category: 'run',
    advancesBall: true,
  },
  {
    id: 'play.pass_complete',
    label: 'Pass complete',
    description: 'Forward pass legally caught by an eligible receiver.',
    leagues: 'all',
    category: 'pass',
    advancesBall: true,
  },
  {
    id: 'play.pass_incomplete',
    label: 'Pass incomplete',
    description: 'Forward pass that hits the ground or goes out of bounds incomplete.',
    leagues: 'all',
    category: 'pass',
    advancesBall: false,
  },
  {
    id: 'play.pass_dropped',
    label: 'Drop',
    description: 'Catchable pass not secured by the receiver.',
    leagues: 'all',
    category: 'pass',
    advancesBall: false,
    notes: 'Subset of incomplete for collection granularity.',
  },
  {
    id: 'play.sack',
    label: 'Sack',
    description: 'Quarterback tackled behind the line while attempting to pass.',
    leagues: 'all',
    category: 'qb',
    advancesBall: true,
  },
  {
    id: 'play.scramble',
    label: 'Scramble',
    description: 'Quarterback runs after dropping back to pass.',
    leagues: 'all',
    category: 'qb',
    advancesBall: true,
  },
  {
    id: 'play.lateral',
    label: 'Lateral / backward pass',
    description: 'Ball thrown or pitched backward or parallel to the line of scrimmage.',
    leagues: 'all',
    category: 'pass',
    advancesBall: true,
  },
  {
    id: 'play.kneel',
    label: 'Kneel / victory formation',
    description: 'QB kneels to run clock; intentional loss of yards.',
    leagues: 'all',
    category: 'clock_management',
    advancesBall: true,
  },
  {
    id: 'play.spike',
    label: 'Spike',
    description: 'Intentional incomplete pass to stop the clock.',
    leagues: ['ncaa', 'nfl'],
    category: 'clock_management',
    advancesBall: false,
    notes: 'CFL clock / procedure differs; treat carefully if collecting CFL.',
  },
  {
    id: 'play.first_down',
    label: 'First down gained',
    description: 'Offense gains enough yards for a new set of downs.',
    leagues: 'all',
    category: 'result',
  },
  {
    id: 'play.turnover_on_downs',
    label: 'Turnover on downs',
    description: 'Offense fails to gain a first down on its last down.',
    leagues: 'all',
    category: 'result',
    notes: 'Last down is 4th (NCAA/NFL) or 3rd (CFL).',
  },
  {
    id: 'play.touchdown_rush',
    label: 'Rushing touchdown',
    description: 'Touchdown scored on a running play.',
    leagues: 'all',
    category: 'result',
    advancesBall: true,
  },
  {
    id: 'play.touchdown_pass',
    label: 'Receiving / passing touchdown',
    description: 'Touchdown scored on a completed forward pass.',
    leagues: 'all',
    category: 'result',
    advancesBall: true,
  },
  {
    id: 'play.touchdown_return',
    label: 'Return touchdown',
    description: 'Touchdown on interception, fumble, kick, or punt return.',
    leagues: 'all',
    category: 'result',
  },
  {
    id: 'play.penalty_only',
    label: 'Penalty — no play',
    description: 'Down replayed or result determined solely by accepted penalty.',
    leagues: 'all',
    category: 'no_play',
  },
  {
    id: 'play.accepted_penalty_on_play',
    label: 'Penalty enforced on play',
    description: 'Live play result stands with penalty yardage / spot enforcement.',
    leagues: 'all',
    category: 'result',
  },
  {
    id: 'play.declined_penalty',
    label: 'Penalty declined',
    description: 'Foul occurred but the offended team declines enforcement.',
    leagues: 'all',
    category: 'result',
  },
  {
    id: 'play.offsetting_penalties',
    label: 'Offsetting penalties',
    description: 'Fouls on both teams offset; down typically replayed.',
    leagues: 'all',
    category: 'no_play',
  },
  {
    id: 'play.challenge_review',
    label: 'Challenge / booth review',
    description: 'Official review that may reverse the called result.',
    leagues: 'all',
    category: 'result',
  },
] as const satisfies readonly PlayTypeDef[]

export type PlayTypeId = (typeof PLAY_TYPES)[number]['id']
