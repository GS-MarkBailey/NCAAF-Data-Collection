import type { GameState, PlayEntry, PlaySimulationState } from '@/types'
import { formatClock } from '@/lib/format'
import { getFootballRuleset } from './rulesets'
import {
  formatBallOn,
  endSwitchCount,
  getBallOnDisplay,
  getBallOnYardLine,
  getEffectiveHomeAttacksRight,
  yardsFromHomeGoal,
  type BallOnArrowSide,
  type BallOnDisplay,
} from './field'

export type { PlaySimulationState, BallOnArrowSide, BallOnDisplay }
export {
  formatBallOn,
  yardsFromHomeGoal,
  endSwitchCount,
  getEffectiveHomeAttacksRight,
  getBallOnDisplay,
  getBallOnYardLine,
}

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

export function createQuarterStartPlay(
  game: Pick<
    GameState,
    | 'fixture'
    | 'down'
    | 'distance'
    | 'ballOn'
    | 'possessionIsHome'
    | 'simulation'
    | 'rulesetId'
  >,
  quarter: number,
): PlayEntry {
  const rules = getFootballRuleset(game.rulesetId)
  const offenseIsHome =
    game.simulation?.offenseIsHome ?? game.possessionIsHome
  const { homeAbbr, awayAbbr, id: fixtureId } = game.fixture

  return {
    id: `quarter-${fixtureId}-${quarter}`,
    quarter,
    down: game.down,
    distance: game.distance,
    ballOn: formatBallOn(
      offenseIsHome,
      game.ballOn,
      homeAbbr,
      awayAbbr,
      rules,
    ),
    description:
      quarter > rules.regulationPeriods
        ? 'Start of overtime'
        : `Start of quarter ${quarter}`,
    clock: formatClock(rules.quarterLengthSeconds),
  }
}

function turnoverPossession(
  game: GameState,
  simulation: PlaySimulationState,
  description: string,
): SimulatedPlayResult {
  const rules = getFootballRuleset(game.rulesetId)
  const offenseIsHome = !simulation.offenseIsHome
  const ballOn = randomInt(
    Math.max(rules.minBallOn, rules.defaultBallOn - 3),
    Math.min(rules.maxBallOn, rules.defaultBallOn + 7),
  )
  const down = rules.minDown
  const distance = rules.firstDownDistance
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
        rules,
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
  const rules = getFootballRuleset(game.rulesetId)
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
    nextBallOn = Math.max(rules.minBallOn, nextBallOn - penalty.yards)
    description = penalty.label
  } else if (roll < 0.28) {
    const yards = randomInt(2, 9)
    description = `Rush for ${yards} yard${yards === 1 ? '' : 's'} (${pick(RUSHERS)})`
    if (yards >= nextDistance) {
      nextBallOn += yards
      nextDown = rules.minDown
      nextDistance = rules.firstDownDistance
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
      nextDown = rules.minDown
      nextDistance = rules.firstDownDistance
    } else {
      nextDown += 1
      nextDistance -= yards
      nextBallOn += yards
    }
  } else if (roll < 0.68) {
    description = pick(INCOMPLETE)
    nextDown += 1
  } else if (roll < 0.78 && nextDown === rules.maxDown) {
    return turnoverPossession(
      game,
      simulation,
      `Punt — fair catch at the ${rules.defaultBallOn}`,
    )
  } else if (roll < 0.88) {
    const yards = randomInt(12, 28)
    description = `Pass complete for ${yards} yards — big gain (${pick(RECEIVERS)})`
    nextBallOn += yards
    nextDown = rules.minDown
    nextDistance = rules.firstDownDistance
  } else {
    const yardsToGoal = rules.fieldLengthYards - nextBallOn
    const yards = Math.max(yardsToGoal, randomInt(8, 25))
    description = `Pass complete for TOUCHDOWN — ${yards} yards (${pick(RECEIVERS)})`
    nextBallOn = rules.defaultBallOn
    nextDown = rules.minDown
    nextDistance = rules.firstDownDistance
    if (offenseIsHome) score.home += rules.touchdownPoints
    else score.away += rules.touchdownPoints
    offenseIsHome = !offenseIsHome
  }

  if (
    nextBallOn >= rules.fieldLengthYards &&
    !description.includes('TOUCHDOWN')
  ) {
    description = `Rush for TOUCHDOWN (${pick(RUSHERS)})`
    nextBallOn = rules.defaultBallOn
    nextDown = rules.minDown
    nextDistance = rules.firstDownDistance
    if (offenseIsHome) score.home += rules.touchdownPoints
    else score.away += rules.touchdownPoints
    offenseIsHome = !offenseIsHome
  }

  if (nextDown > rules.maxDown) {
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
      ballOn: formatBallOn(offenseIsHome, nextBallOn, H, A, rules),
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

  // Operator session: never invent plays that rewrite down / distance / score.
  // (Take Control used to gate this, but that flag is off by default.)
  if (game.takeControlActive || game.gameStarted || game.playInProgress) {
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
