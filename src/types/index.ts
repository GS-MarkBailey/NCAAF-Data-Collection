import type { FootballCode } from '@/lib/football/rulesets'
import type { FlagEvent, FlagTypeId } from '@/lib/football/flagRules'
import type { PlayCollectionStepId } from '@/lib/football/playCollectionFlow'
import type { PlayUndoSnapshot } from '@/lib/football/playUndo'

export type { FootballCode, PlayCollectionStepId, FlagEvent, FlagTypeId }

/** How the ball will next be put in play. */
export type SeriesKind = 'scrimmage' | 'free_kick' | 'try'

export type RiskType =
  | 'challengeReview'
  | 'statDelay'
  | 'bigPlay'
  | 'flag'
  | 'touchdown'
  | 'playAboutToStart'

export interface Fixture {
  id: string
  eventId: string
  homeTeam: string
  homeAbbr: string
  awayTeam: string
  awayAbbr: string
  startDate: string
  startTime: string
  /** Final score for completed fixtures */
  finalScore?: { home: number; away: number }
}

export interface PlayEntry {
  id: string
  quarter: number
  down: number
  distance: number
  ballOn: string
  description: string
  clock: string
}

/** One operator-collected datapoint in session order. */
export interface CollectedDatapoint {
  id: string
  /** Stable option / event key (e.g. touchback, return). */
  key: string
  /** Display label (PascalCase collection name when known). */
  label: string
  /** Team credited for the datapoint (home/away abbr), when applicable. */
  teamAbbr?: string
  period: number
  clock: string
  /** Wall-clock ms when collected. */
  collectedAt: number
  /** Spotting yard line when relevant for export (kickoff / yards); else null. */
  ballOn?: number | null
  /** Drive number when in a scrimmage drive; else null. */
  drive?: number | null
  /** Play number within the drive; else null. */
  play?: number | null
  /** Down at collection time when in a drive; else null. */
  down?: number | null
  /** Yards to go at collection time when in a drive; else null. */
  toGo?: number | null
}

export interface PlaySimulationState {
  ticksUntilNextPlay: number
  offenseIsHome: boolean
  sequence: number
}

export interface GameState {
  fixture: Fixture
  /** League rules pack (college / NFL / CFL). Defaults to NCAA for this product. */
  rulesetId: FootballCode
  /** null until the operator sets field direction on first open */
  homeAttacksRight: boolean | null
  score: { home: number; away: number }
  clock: {
    seconds: number
    running: boolean
    period: number
  }
  down: number
  distance: number
  ballOn: number
  possessionIsHome: boolean
  risks: Record<RiskType, boolean>
  takeControlActive: boolean
  /** False until the operator kicks off Q1 for this fixture session */
  gameStarted: boolean
  /** True after the operator ends the game at the regulation decision */
  gameEnded: boolean
  /** True after the operator ends the current period (before the next starts) */
  periodEnded: boolean
  /** True between SNAP and END PLAY while the operator is collecting a play */
  playInProgress: boolean
  /**
   * How the ball will next be put in play (scrimmage / free kick / try).
   * Drives match-phase collectables alongside playInProgress / period flags.
   */
  seriesKind: SeriesKind
  /**
   * Progressive collection step after SNAP (rush/throw → result → yards).
   * Null when no live play is in progress.
   */
  playCollectionStep: PlayCollectionStepId | null
  /** Choices made during the current live play (option ids in order). */
  playCollectionPath: string[]
  /** Session log of datapoints collected (survives END PLAY). */
  collectedDatapoints: CollectedDatapoint[]
  /** Current drive number (0 until first scrimmage snap). */
  driveNumber: number
  /** Current play number within the drive (0 until first snap). */
  playNumber: number
  /** Next snap should open a new drive (after kickoff / possession change). */
  awaitingNewDrive: boolean
  /** Snapshots for Play controls Undo (collection / yards / snap / end). */
  playUndoStack: PlayUndoSnapshot[]
  /**
   * Flags (penalties) collected this session.
   * Enforcement uses `flagRules` for `rulesetId`.
   */
  flagEvents: FlagEvent[]
  /**
   * Play-collection snapshot to restore if a flag is declined / undone
   * while a live play was in progress.
   */
  flagResume: {
    playInProgress: boolean
    playCollectionStep: PlayCollectionStepId | null
    playCollectionPath: string[]
  } | null
  /** Net yards gained for the offense since the last SNAP */
  playYardsGained: number
  /** Down / distance / ball-on at SNAP (used when ending the play) */
  playStartDown: number
  playStartDistance: number
  playStartBallOn: number
  plays: PlayEntry[]
  simulation?: PlaySimulationState
}

export type {
  UserAction,
  UserActionType,
  UserActionPayload,
  ActionLog,
  ActionLogsByFixture,
  TakeControlAction,
  RiskToggleAction,
  ClockToggleAction,
  ClockAdjustAction,
} from './actions'
