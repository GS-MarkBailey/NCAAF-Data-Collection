import type { Fixture, PlayEntry } from '@/types'
import { formatClock } from '@/lib/format'
import { applyYardDelta } from './ballOn'
import {
  FIRST_DOWN_DISTANCE,
  clampDistance,
  clampDown,
  MAX_DOWN,
} from './downDistance'
import { flipPossessionAtSpot } from './possession'
import { formatBallOn } from './field'

export interface LivePlaySituation {
  down: number
  distance: number
  ballOn: number
  possessionIsHome: boolean
  playInProgress: boolean
  playYardsGained: number
  playStartDown: number
  playStartDistance: number
  playStartBallOn: number
}

export interface PlaySnapResult {
  playInProgress: true
  playYardsGained: 0
  playStartDown: number
  playStartDistance: number
  playStartBallOn: number
}

export interface PlayYardAdjustResult {
  ballOn: number
  distance: number
  playYardsGained: number
  /** Actual yards applied after ball-on clamping (0 if nothing moved). */
  actualDelta: number
}

export type EndedPlayOutcome =
  | 'first_down'
  | 'next_down'
  | 'turnover_on_downs'

export interface ResolveEndedPlayInput {
  down: number
  distance: number
  ballOn: number
  possessionIsHome: boolean
  playYardsGained: number
  playStartDown: number
  playStartDistance: number
  clockPeriod: number
  clockSeconds: number
  homeAbbr: string
  awayAbbr: string
  /** Optional id for the play-by-play entry (defaults to crypto.randomUUID). */
  playId?: string
}

export interface ResolveEndedPlayResult {
  outcome: EndedPlayOutcome
  down: number
  distance: number
  ballOn: number
  possessionIsHome: boolean
  yardsGained: number
  description: string
  play: PlayEntry
  /** Clear live-play bookkeeping after END PLAY. */
  playInProgress: false
  playYardsGained: 0
}

/** Snapshot situation at SNAP — does not change down/distance/ball-on. */
export function startLivePlay(situation: {
  down: number
  distance: number
  ballOn: number
}): PlaySnapResult {
  return {
    playInProgress: true,
    playYardsGained: 0,
    playStartDown: situation.down,
    playStartDistance: situation.distance,
    playStartBallOn: situation.ballOn,
  }
}

/** Apply ± yards during a live play (updates ball-on, to-go, and net gain). */
export function adjustLivePlayYards(params: {
  ballOn: number
  distance: number
  playYardsGained: number
  delta: number
}): PlayYardAdjustResult {
  const { ballOn, distance } = applyYardDelta({
    ballOn: params.ballOn,
    distance: params.distance,
    delta: params.delta,
  })
  const actualDelta = ballOn - params.ballOn
  return {
    ballOn,
    distance,
    actualDelta,
    playYardsGained: params.playYardsGained + actualDelta,
  }
}

function describeEndedPlay(params: {
  yardsGained: number
  outcome: EndedPlayOutcome
}): string {
  const { yardsGained, outcome } = params
  if (outcome === 'turnover_on_downs') {
    return yardsGained === 0
      ? 'Play ended — turnover on downs'
      : `Play ended — ${yardsGained > 0 ? '+' : ''}${yardsGained} yards, turnover on downs`
  }

  if (yardsGained === 0) {
    return outcome === 'first_down'
      ? 'Play ended — no gain, first down'
      : 'Play ended — no gain'
  }

  return `Play ended — ${yardsGained > 0 ? '+' : ''}${yardsGained} yards${
    outcome === 'first_down' ? ', first down' : ''
  }`
}

/**
 * Resolve END PLAY into the next down/distance/possession and a play-by-play row.
 * Does not award touchdowns or other scores — those can plug in later.
 */
export function resolveEndedPlay(
  input: ResolveEndedPlayInput,
): ResolveEndedPlayResult {
  const yardsGained = input.playYardsGained
  const firstDown = yardsGained >= input.playStartDistance

  let outcome: EndedPlayOutcome
  let down: number
  let distance: number
  let ballOn = input.ballOn
  let possessionIsHome = input.possessionIsHome

  if (firstDown) {
    outcome = 'first_down'
    down = 1
    distance = FIRST_DOWN_DISTANCE
  } else if (input.down >= MAX_DOWN) {
    outcome = 'turnover_on_downs'
    const flipped = flipPossessionAtSpot({
      possessionIsHome: input.possessionIsHome,
      ballOn: input.ballOn,
    })
    possessionIsHome = flipped.possessionIsHome
    ballOn = flipped.ballOn
    down = 1
    distance = FIRST_DOWN_DISTANCE
  } else {
    outcome = 'next_down'
    down = clampDown(input.down + 1)
    distance = clampDistance(input.playStartDistance - yardsGained)
  }

  const description = describeEndedPlay({ yardsGained, outcome })
  const play: PlayEntry = {
    id: input.playId ?? crypto.randomUUID(),
    quarter: input.clockPeriod,
    down: input.playStartDown,
    distance: input.playStartDistance,
    ballOn: formatBallOn(
      input.possessionIsHome,
      input.ballOn,
      input.homeAbbr,
      input.awayAbbr,
    ),
    description,
    clock: formatClock(input.clockSeconds),
  }

  return {
    outcome,
    down,
    distance,
    ballOn,
    possessionIsHome,
    yardsGained,
    description,
    play,
    playInProgress: false,
    playYardsGained: 0,
  }
}

/** Convenience: pull resolve inputs from a fixture + live play fields. */
export function resolveEndedPlayFromGame(params: {
  fixture: Fixture
  clockPeriod: number
  clockSeconds: number
  down: number
  distance: number
  ballOn: number
  possessionIsHome: boolean
  playYardsGained: number
  playStartDown: number
  playStartDistance: number
  playId?: string
}): ResolveEndedPlayResult {
  return resolveEndedPlay({
    down: params.down,
    distance: params.distance,
    ballOn: params.ballOn,
    possessionIsHome: params.possessionIsHome,
    playYardsGained: params.playYardsGained,
    playStartDown: params.playStartDown,
    playStartDistance: params.playStartDistance,
    clockPeriod: params.clockPeriod,
    clockSeconds: params.clockSeconds,
    homeAbbr: params.fixture.homeAbbr,
    awayAbbr: params.fixture.awayAbbr,
    playId: params.playId,
  })
}
