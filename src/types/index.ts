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

export interface PlaySimulationState {
  ticksUntilNextPlay: number
  offenseIsHome: boolean
  sequence: number
}

export interface GameState {
  fixture: Fixture
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
