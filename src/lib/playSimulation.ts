import type { GameState, PlayEntry, PlaySimulationState } from '@/types'
import { QUARTER_LENGTH_SECONDS, REGULATION_QUARTERS } from '@/lib/clock'
import { formatClock } from '@/lib/format'

export type { PlaySimulationState }

export interface SimulatedPlayResult {
  play: PlayEntry
  down: number
  distance: number
  ballOn: number
  offenseIsHome: boolean
  score: { home: number; away: number }
  simulation: PlaySimulationState
}

const RUSHERS = ['Williams #4', 'Johnson #22', 'Thompson #7']
const RECEIVERS = ['Davis #11', 'Miller #88', 'Carter #19']
const DEFENDERS = ['Harrison #55', 'Brooks #24', 'Nguyen #31']

const INCOMPLETE = [
  'Pass incomplete — WR covered on the outside',
  'Pass incomplete — overthrown seam route',
  'Pass incomplete — tipped at the line of scrimmage',
  'Pass incomplete — CB broke up the slant',
  'Pass incomplete — pressure forced a throwaway',
  'Pass incomplete — WR dropped a contested catch',
]

const PENALTIES = [
  { yards: 5, label: 'False start — 5 yard penalty' },
  { yards: 5, label: 'Delay of game — 5 yard penalty' },
  { yards: 10, label: 'Holding — 10 yard penalty' },
  { yards: 10, label: 'Pass interference — 10 yard penalty' },
  { yards: 15, label: 'Personal foul — 15 yard penalty' },
]

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function nextPlayInterval(): number {
  return randomInt(22, 38)
}

export function createInitialSimulation(offenseIsHome = true): PlaySimulationState {
  return {
    ticksUntilNextPlay: nextPlayInterval(),
    offenseIsHome,
    sequence: 0,
  }
}

export function formatBallOn(
  offenseIsHome: boolean,
  yardsFromOwnGoal: number,
  homeAbbr: string,
  awayAbbr: string,
): string {
  const yards = Math.max(1, Math.min(99, yardsFromOwnGoal))
  if (yards <= 50) {
    return `${offenseIsHome ? homeAbbr : awayAbbr} ${yards}`
  }
  const oppYards = 100 - yards
  return `${offenseIsHome ? awayAbbr : homeAbbr} ${oppYards}`
}

export type BallOnArrowSide = 'left' | 'right'

export interface BallOnDisplay {
  yardLine: number
  arrowSide: BallOnArrowSide
}

/** Convert offense-relative ball position to yards from the home goal line. */
export function yardsFromHomeGoal(
  yardsFromOwnGoal: number,
  offenseIsHome: boolean,
): number {
  const yards = Math.max(1, Math.min(99, yardsFromOwnGoal))
  return offenseIsHome ? yards : 100 - yards
}

/**
 * End-of-quarter switches that flip displayed field direction.
 * Teams switch after Q1 and Q3; they stay on the same end through halftime (Q2→Q3).
 */
export function endSwitchCount(period: number): number {
  if (period <= 1) return 0
  if (period <= 3) return 1
  return 2
}

/** Q1 base direction adjusted for end-of-quarter switches. */
export function getEffectiveHomeAttacksRight(
  homeAttacksRight: boolean,
  period: number,
): boolean {
  return endSwitchCount(period) % 2 === 1 ? !homeAttacksRight : homeAttacksRight
}

/** Yard line (1–50) and attack-direction arrow from yards-from-home-goal. */
export function getBallOnDisplay(
  yardsFromHomeGoal: number,
  homeAttacksRight: boolean,
): BallOnDisplay {
  const yards = Math.max(1, Math.min(99, yardsFromHomeGoal))
  const onHomeSide = yards <= 50
  const homeSideArrow: BallOnArrowSide = homeAttacksRight ? 'right' : 'left'
  const awaySideArrow: BallOnArrowSide = homeAttacksRight ? 'left' : 'right'

  return {
    yardLine: onHomeSide ? yards : 100 - yards,
    arrowSide: onHomeSide ? homeSideArrow : awaySideArrow,
  }
}

/** Display yard line (1–50) from offense-relative field position. */
export function getBallOnYardLine(yardsFromOwnGoal: number): number {
  const yards = Math.max(1, Math.min(99, yardsFromOwnGoal))
  return yards <= 50 ? yards : 100 - yards
}

export function createQuarterStartPlay(
  game: Pick<
    GameState,
    'fixture' | 'down' | 'distance' | 'ballOn' | 'possessionIsHome' | 'simulation'
  >,
  quarter: number,
): PlayEntry {
  const offenseIsHome =
    game.simulation?.offenseIsHome ?? game.possessionIsHome
  const { homeAbbr, awayAbbr, id: fixtureId } = game.fixture

  return {
    id: `quarter-${fixtureId}-${quarter}`,
    quarter,
    down: game.down,
    distance: game.distance,
    ballOn: formatBallOn(offenseIsHome, game.ballOn, homeAbbr, awayAbbr),
    description:
      quarter > REGULATION_QUARTERS
        ? 'Start of overtime'
        : `Start of quarter ${quarter}`,
    clock: formatClock(QUARTER_LENGTH_SECONDS),
  }
}

function turnoverPossession(
  game: GameState,
  simulation: PlaySimulationState,
  description: string,
): SimulatedPlayResult {
  const offenseIsHome = !simulation.offenseIsHome
  const ballOn = randomInt(22, 32)
  const down = 1
  const distance = 10
  const sequence = simulation.sequence + 1

  return {
    play: {
      id: `live-${game.fixture.id}-${sequence}`,
      quarter: game.clock.period,
      down,
      distance,
      ballOn: formatBallOn(
        offenseIsHome,
        ballOn,
        game.fixture.homeAbbr,
        game.fixture.awayAbbr,
      ),
      description,
      clock: formatClock(game.clock.seconds),
    },
    down,
    distance,
    ballOn,
    offenseIsHome,
    score: { ...game.score },
    simulation: {
      offenseIsHome,
      sequence,
      ticksUntilNextPlay: nextPlayInterval(),
    },
  }
}

export function simulateLivePlay(
  game: GameState,
  simulation: PlaySimulationState,
): SimulatedPlayResult {
  const { fixture, clock, down, distance, ballOn } = game
  const { homeAbbr: H, awayAbbr: A } = fixture
  let offenseIsHome = simulation.offenseIsHome
  let nextDown = down
  let nextDistance = distance
  let nextBallOn = ballOn
  let description = ''
  let score = { ...game.score }

  const roll = Math.random()

  if (roll < 0.04) {
    return turnoverPossession(
      game,
      simulation,
      `Interception — ${pick(DEFENDERS)} undercuts the route`,
    )
  }

  if (roll < 0.06) {
    return turnoverPossession(
      game,
      simulation,
      'Fumble — loose ball recovered by the defense',
    )
  }

  if (roll < 0.11) {
    const penalty = pick(PENALTIES)
    nextBallOn = Math.max(1, nextBallOn - penalty.yards)
    description = penalty.label
  } else if (roll < 0.28) {
    const yards = randomInt(2, 9)
    description = `Rush for ${yards} yard${yards === 1 ? '' : 's'} (${pick(RUSHERS)})`
    if (yards >= nextDistance) {
      nextBallOn += yards
      nextDown = 1
      nextDistance = 10
    } else {
      nextDown += 1
      nextDistance -= yards
      nextBallOn += yards
    }
  } else if (roll < 0.48) {
    const yards = randomInt(4, 18)
    description = `Pass complete for ${yards} yard${yards === 1 ? '' : 's'} (${pick(RECEIVERS)})`
    if (yards >= nextDistance) {
      nextBallOn += yards
      nextDown = 1
      nextDistance = 10
    } else {
      nextDown += 1
      nextDistance -= yards
      nextBallOn += yards
    }
  } else if (roll < 0.68) {
    description = pick(INCOMPLETE)
    nextDown += 1
  } else if (roll < 0.78 && nextDown === 4) {
    return turnoverPossession(
      game,
      simulation,
      'Punt — fair catch at the 25',
    )
  } else if (roll < 0.88) {
    const yards = randomInt(12, 28)
    description = `Pass complete for ${yards} yards — big gain (${pick(RECEIVERS)})`
    nextBallOn += yards
    nextDown = 1
    nextDistance = 10
  } else {
    const yardsToGoal = 100 - nextBallOn
    const yards = Math.max(yardsToGoal, randomInt(8, 25))
    description = `Pass complete for TOUCHDOWN — ${yards} yards (${pick(RECEIVERS)})`
    nextBallOn = 25
    nextDown = 1
    nextDistance = 10
    if (offenseIsHome) score.home += 6
    else score.away += 6
    offenseIsHome = !offenseIsHome
  }

  if (nextBallOn >= 100 && !description.includes('TOUCHDOWN')) {
    description = `Rush for TOUCHDOWN (${pick(RUSHERS)})`
    nextBallOn = 25
    nextDown = 1
    nextDistance = 10
    if (offenseIsHome) score.home += 6
    else score.away += 6
    offenseIsHome = !offenseIsHome
  }

  if (nextDown > 4) {
    return turnoverPossession(
      game,
      simulation,
      'Turnover on downs — possession changes',
    )
  }

  const sequence = simulation.sequence + 1

  return {
    play: {
      id: `live-${fixture.id}-${sequence}`,
      quarter: clock.period,
      down: nextDown,
      distance: nextDistance,
      ballOn: formatBallOn(offenseIsHome, nextBallOn, H, A),
      description,
      clock: formatClock(clock.seconds),
    },
    down: nextDown,
    distance: nextDistance,
    ballOn: nextBallOn,
    offenseIsHome,
    score,
    simulation: {
      offenseIsHome,
      sequence,
      ticksUntilNextPlay: nextPlayInterval(),
    },
  }
}

export function tickPlaySimulation(
  game: GameState,
): Partial<GameState> | null {
  if (!game.simulation || !game.clock.running || game.clock.seconds <= 0) {
    return null
  }

  if (game.takeControlActive) {
    return null
  }

  const ticksUntilNextPlay = game.simulation.ticksUntilNextPlay - 1

  if (ticksUntilNextPlay > 0) {
    return {
      simulation: { ...game.simulation, ticksUntilNextPlay },
    }
  }

  const result = simulateLivePlay(game, game.simulation)

  return {
    plays: [...game.plays, result.play],
    down: result.down,
    distance: result.distance,
    ballOn: result.ballOn,
    score: result.score,
    possessionIsHome: result.offenseIsHome,
    simulation: result.simulation,
  }
}
