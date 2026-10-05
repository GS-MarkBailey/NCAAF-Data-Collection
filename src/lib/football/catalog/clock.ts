import type { CatalogEntryBase } from './types'

/**
 * Clock / period operator events — complements `football/clock.ts` workflow helpers.
 */
export interface ClockEventDef extends CatalogEntryBase {
  category: 'game_clock' | 'play_clock' | 'period' | 'timeout' | 'stoppage'
}

export const CLOCK_EVENTS = [
  {
    id: 'clock.start',
    label: 'Start game clock',
    description: 'Game clock begins or resumes running.',
    leagues: 'all',
    category: 'game_clock',
  },
  {
    id: 'clock.stop',
    label: 'Stop game clock',
    description: 'Game clock stopped (incomplete, OOB, timeout, score, etc.).',
    leagues: 'all',
    category: 'game_clock',
  },
  {
    id: 'clock.ten_second_runoff',
    label: '10-second runoff',
    description: 'NFL (and some NCAA cases): clock runoff after certain fouls/spikes inside 1:00.',
    leagues: ['nfl', 'ncaa'],
    category: 'game_clock',
  },
  {
    id: 'clock.play_clock_reset_25',
    label: 'Play clock — 25',
    description: 'Play clock set to 25 seconds.',
    leagues: ['ncaa', 'nfl'],
    category: 'play_clock',
  },
  {
    id: 'clock.play_clock_reset_40',
    label: 'Play clock — 40',
    description: 'Play clock set to 40 seconds.',
    leagues: ['ncaa', 'nfl'],
    category: 'play_clock',
  },
  {
    id: 'clock.play_clock_cfl',
    label: 'CFL time count / play clock',
    description: 'CFL snap-clock / time-count administration.',
    leagues: ['cfl'],
    category: 'play_clock',
  },
  {
    id: 'clock.timeout_offense',
    label: 'Timeout — offense',
    description: 'Charged timeout requested by the offense.',
    leagues: 'all',
    category: 'timeout',
  },
  {
    id: 'clock.timeout_defense',
    label: 'Timeout — defense',
    description: 'Charged timeout requested by the defense.',
    leagues: 'all',
    category: 'timeout',
  },
  {
    id: 'clock.timeout_injury',
    label: 'Injury timeout / official timeout',
    description: 'Clock stoppage for injury or official’s timeout.',
    leagues: 'all',
    category: 'timeout',
  },
  {
    id: 'clock.two_minute_warning',
    label: 'Two-minute warning',
    description: 'Automatic stoppage near the end of a half (NFL).',
    leagues: ['nfl'],
    category: 'stoppage',
    notes: 'NCAA uses three-minute / other media windows differently; CFL has its own timing cues.',
  },
  {
    id: 'clock.period_end',
    label: 'End of period',
    description: 'Regulation period expires.',
    leagues: 'all',
    category: 'period',
  },
  {
    id: 'clock.period_start',
    label: 'Start of period',
    description: 'Next regulation period begins.',
    leagues: 'all',
    category: 'period',
  },
  {
    id: 'clock.halftime',
    label: 'Halftime',
    description: 'Intermission after the second period.',
    leagues: 'all',
    category: 'period',
  },
  {
    id: 'clock.overtime_start',
    label: 'Overtime start',
    description: 'Extra period(s) after regulation.',
    leagues: 'all',
    category: 'period',
    notes: 'OT formats differ sharply: NFL sudden-death variants vs NCAA possession OT vs CFL.',
  },
  {
    id: 'clock.game_end',
    label: 'Game end',
    description: 'Final whistle; match ended.',
    leagues: 'all',
    category: 'period',
  },
] as const satisfies readonly ClockEventDef[]

export type ClockEventId = (typeof CLOCK_EVENTS)[number]['id']
