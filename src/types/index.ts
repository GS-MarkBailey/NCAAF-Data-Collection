import type { FootballCode } from '@/lib/football/rulesets'
import type { PlayCollectionStepId } from '@/lib/football/playCollectionFlow'
import type { PlayUndoSnapshot } from '@/lib/football/playUndo'

export type { FootballCode, PlayCollectionStepId }

/** How the ball will next be put in play. */
export type SeriesKind = 'scrimmage' | 'free_kick' | 'try'

export type RiskType =
  | 'challengeReview'
  | 'statDelay'
  | 'bigPlay'
  | 'penalty'
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
  period: number
  clock: string
  /** Wall-clock ms when collected. */
  collectedAt: number
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
  /** Snapshots for Play controls Undo (collection / yards / snap / end). */
  playUndoStack: PlayUndoSnapshot[]
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
