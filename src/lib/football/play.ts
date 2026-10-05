import type { Fixture, PlayEntry } from '@/types'
import { formatClock } from '@/lib/format'
import { applyYardDelta } from './ballOn'
import { clampDistance, clampDown } from './downDistance'
import { flipPossessionAtSpot } from './possession'
import { formatBallOn } from './field'
import {
  resolveFootballRuleset,
  type RulesetRef,
} from './rulesets'
import { awardedFirstDownStopsClock } from './clockContract'

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
  | 'incomplete'
  | 'interception'
  | 'fumble_lost'
  | 'punt'
  | 'kickoff_touchback'
  | 'kickoff_return'
  | 'kickoff_fair_catch'
  | 'kickoff_out_of_bounds'
  | 'kickoff_touchdown'
  | 'kickoff_recovery'
  | 'touchdown'
  | 'conversion_kick_good'
  | 'conversion_kick_miss'
  | 'conversion_play_good'
  | 'conversion_play_miss'
  | 'defensive_conversion'

export type PlayResultKind =
  | 'yards'
  | 'incomplete'
  | 'interception'
  | 'fumble_lost'
  | 'punt'
  | 'play_out_of_bounds'
  | 'touchdown'
  | 'kickoff_touchback'
  | 'kickoff_return'
  | 'kickoff_fair_catch'
  | 'kickoff_out_of_bounds'
  | 'kickoff_touchdown'
  | 'kickoff_recovery_receiving'
  | 'kickoff_recovery_kicking'
  | 'conversion_kick_good'
  | 'conversion_kick_miss'
  | 'conversion_play_good'
  | 'conversion_play_miss'
  | 'defensive_conversion'

export interface ResolveEndedPlayInput {
  down: number
  distance: number
  ballOn: number
  possessionIsHome: boolean
  playYardsGained: number
  playStartDown: number
  playStartDistance: number
  playStartBallOn: number
  /** Progressive collection choices for this live play (option ids). */
  playCollectionPath?: readonly string[]
  clockPeriod: number
  clockSeconds: number
  homeAbbr: string
  awayAbbr: string
  /** Optional id for the play-by-play entry (defaults to crypto.randomUUID). */
  playId?: string
  rules?: RulesetRef
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
  /** NCAA: stop game clock for this dead-ball reason. */
  stopClock: boolean
  /** Points to add to the team that had possession at snap/kick (receiving on KO). */
  scoreHomeDelta: number
  scoreAwayDelta: number
  /** Touchdown on the play → next series is try. */
  scoredTouchdown: boolean
  /** Next series after this play. */
  nextSeries: 'scrimmage' | 'free_kick' | 'try'
}

/** Map collection path → how END PLAY should resolve. */
export function getPlayResultKind(
  path: readonly string[] | null | undefined,
): PlayResultKind {
  if (!path?.length) return 'yards'

  const isKickoff = path.includes('kickoff')
  const isTry = path.includes('try')

  for (let index = path.length - 1; index >= 0; index -= 1) {
    const id = path[index]
    if (isTry) {
      switch (id) {
        case 'pat_good':
          return 'conversion_kick_good'
        case 'pat_no_good':
          return 'conversion_kick_miss'
        case 'two_point_good':
          return 'conversion_play_good'
        case 'two_point_no_good':
          return 'conversion_play_miss'
        case 'defensive_two_point':
          return 'defensive_conversion'
        default:
          break
      }
    }
    if (isKickoff) {
      switch (id) {
        case 'touchback':
          return 'kickoff_touchback'
        case 'fair_catch':
          return 'kickoff_fair_catch'
        case 'kick_out_of_bounds':
          return 'kickoff_out_of_bounds'
        case 'return_touchdown':
          return 'kickoff_touchdown'
        case 'recovery_kicking':
          return 'kickoff_recovery_kicking'
        case 'recovery_receiving':
          return 'kickoff_recovery_receiving'
        case 'tackle':
        case 'return_out_of_bounds':
        case 'return':
          return 'kickoff_return'
        default:
          break
      }
    }

    switch (id) {
      case 'touchdown':
        return 'touchdown'
      case 'incomplete':
      case 'out_of_bounds':
        return 'incomplete'
      case 'interception':
        return 'interception'
      case 'recovery_defense':
      case 'rush_fumble':
        return 'fumble_lost'
      case 'recovery_offense':
        // Own recovery — treat as yards play at the spot.
        return 'yards'
      case 'play_fumble':
        // Fumble chosen but recovery not collected yet — should not END PLAY.
        return 'yards'
      case 'punt':
        return 'punt'
      case 'play_out_of_bounds':
        return 'play_out_of_bounds'
      case 'tackle':
      case 'catch':
      case 'rush':
        return 'yards'
      default:
        break
    }
  }

  if (isKickoff) return 'kickoff_return'
  return 'yards'
}

/** First-and-10 or first-and-goal from offense-relative ball-on. */
export function distanceForNewSeries(
  ballOn: number,
  rulesRef?: RulesetRef,
): number {
  const rules = resolveFootballRuleset(rulesRef)
  const yardsToGoal = Math.max(rules.minDistance, rules.fieldLengthYards - ballOn)
  return clampDistance(
    Math.min(rules.firstDownDistance, yardsToGoal),
    rules,
  )
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
  rules?: RulesetRef
}): PlayYardAdjustResult {
  const { ballOn, distance } = applyYardDelta({
    ballOn: params.ballOn,
    distance: params.distance,
    delta: params.delta,
    rules: params.rules,
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
  switch (outcome) {
    case 'incomplete':
      return 'Incomplete pass'
    case 'interception':
      return 'Interception — change of possession'
    case 'fumble_lost':
      return 'Fumble lost — change of possession'
    case 'punt':
      return yardsGained === 0
        ? 'Punt — change of possession'
        : `Punt — ${yardsGained > 0 ? '+' : ''}${yardsGained} yards, change of possession`
    case 'kickoff_touchback':
      return 'Kickoff — touchback'
    case 'kickoff_fair_catch':
      return 'Kickoff — fair catch'
    case 'kickoff_out_of_bounds':
      return 'Kickoff — out of bounds'
    case 'kickoff_touchdown':
      return 'Kickoff return — touchdown'
    case 'touchdown':
      return 'Touchdown'
    case 'conversion_kick_good':
      return 'Extra point — good'
    case 'conversion_kick_miss':
      return 'Extra point — no good'
    case 'conversion_play_good':
      return 'Two-point conversion — good'
    case 'conversion_play_miss':
      return 'Two-point conversion — no good'
    case 'defensive_conversion':
      return 'Defensive two-point conversion'
    case 'kickoff_recovery':
      return 'Kickoff — recovered'
    case 'kickoff_return':
      return yardsGained === 0
        ? 'Kickoff return'
        : `Kickoff return — ${yardsGained > 0 ? '+' : ''}${yardsGained} yards`
    case 'turnover_on_downs':
      return yardsGained === 0
        ? 'Play ended — turnover on downs'
        : `Play ended — ${yardsGained > 0 ? '+' : ''}${yardsGained} yards, turnover on downs`
    case 'first_down':
      return yardsGained === 0
        ? 'Play ended — no gain, first down'
        : `Play ended — ${yardsGained > 0 ? '+' : ''}${yardsGained} yards, first down`
    case 'next_down':
      return yardsGained === 0
        ? 'Play ended — no gain'
        : `Play ended — ${yardsGained > 0 ? '+' : ''}${yardsGained} yards`
  }
}

function newScrimmageSeries(
  ballOn: number,
  possessionIsHome: boolean,
  rules: ReturnType<typeof resolveFootballRuleset>,
): Pick<
  ResolveEndedPlayResult,
  'down' | 'distance' | 'ballOn' | 'possessionIsHome' | 'nextSeries'
> {
  return {
    possessionIsHome,
    ballOn,
    down: rules.minDown,
    distance: distanceForNewSeries(ballOn, rules),
    nextSeries: 'scrimmage',
  }
}

function changeOfPossessionSeries(params: {
  possessionIsHome: boolean
  ballOn: number
  rules: ReturnType<typeof resolveFootballRuleset>
}): Pick<
  ResolveEndedPlayResult,
  'possessionIsHome' | 'ballOn' | 'down' | 'distance'
> {
  const flipped = flipPossessionAtSpot({
    possessionIsHome: params.possessionIsHome,
    ballOn: params.ballOn,
    rules: params.rules,
  })
  return {
    possessionIsHome: flipped.possessionIsHome,
    ballOn: flipped.ballOn,
    down: params.rules.minDown,
    distance: distanceForNewSeries(flipped.ballOn, params.rules),
  }
}

/**
 * Resolve END PLAY into the next down/distance/possession and a play-by-play row.
 * Honors progressive collection path (kickoff / incomplete / INT / fumble / punt).
 */
export function resolveEndedPlay(
  input: ResolveEndedPlayInput,
): ResolveEndedPlayResult {
  const rules = resolveFootballRuleset(input.rules)
  const resultKind = getPlayResultKind(input.playCollectionPath)

  let outcome: EndedPlayOutcome
  // Initialized so every branch is assign-safe for tsc; applyNewSeries overwrites.
  let down = input.down
  let distance = input.distance
  let ballOn = input.ballOn
  let possessionIsHome = input.possessionIsHome
  let yardsGained = input.playYardsGained
  let stopClock = false
  let scoreHomeDelta = 0
  let scoreAwayDelta = 0
  let scoredTouchdown = false
  let nextSeries: ResolveEndedPlayResult['nextSeries'] = 'scrimmage'

  const applyNewSeries = (spot: number, poss: boolean) => {
    const series = newScrimmageSeries(spot, poss, rules)
    down = series.down
    distance = series.distance
    ballOn = series.ballOn
    possessionIsHome = series.possessionIsHome
    nextSeries = series.nextSeries
  }

  // During kickoff collection, possessionIsHome is the *receiving* team
  // (next offense). The kick is by the opposite side.
  const kickReceivingIsHome = input.possessionIsHome
  const kickKickingIsHome = !input.possessionIsHome

  if (resultKind === 'kickoff_touchback') {
    outcome = 'kickoff_touchback'
    stopClock = true
    yardsGained = 0
    applyNewSeries(rules.defaultBallOn, kickReceivingIsHome)
  } else if (resultKind === 'kickoff_fair_catch') {
    outcome = 'kickoff_fair_catch'
    stopClock = true
    applyNewSeries(input.ballOn, kickReceivingIsHome)
  } else if (resultKind === 'kickoff_out_of_bounds') {
    // Simplified NCAA-style spot for receiving team after kickoff OOB.
    outcome = 'kickoff_out_of_bounds'
    stopClock = true
    yardsGained = 0
    applyNewSeries(35, kickReceivingIsHome)
  } else if (resultKind === 'kickoff_touchdown') {
    outcome = 'kickoff_touchdown'
    stopClock = true
    scoredTouchdown = true
    nextSeries = 'try'
    down = rules.minDown
    distance = rules.minDistance
    ballOn = rules.maxBallOn
    possessionIsHome = kickReceivingIsHome
    if (kickReceivingIsHome) scoreHomeDelta = rules.touchdownPoints
    else scoreAwayDelta = rules.touchdownPoints
  } else if (resultKind === 'kickoff_recovery_kicking') {
    outcome = 'kickoff_recovery'
    stopClock = true
    // Onside / muff recovered by kicking team — they become the offense.
    applyNewSeries(input.ballOn, kickKickingIsHome)
  } else if (resultKind === 'kickoff_recovery_receiving') {
    outcome = 'kickoff_recovery'
    stopClock = true
    applyNewSeries(input.ballOn, kickReceivingIsHome)
  } else if (resultKind === 'kickoff_return') {
    outcome = 'kickoff_return'
    stopClock = true
    applyNewSeries(input.ballOn, kickReceivingIsHome)
  } else if (resultKind === 'touchdown') {
    outcome = 'touchdown'
    stopClock = true
    scoredTouchdown = true
    nextSeries = 'try'
    down = rules.minDown
    distance = rules.minDistance
    ballOn = rules.maxBallOn
    if (input.possessionIsHome) scoreHomeDelta = rules.touchdownPoints
    else scoreAwayDelta = rules.touchdownPoints
  } else if (
    resultKind === 'conversion_kick_good' ||
    resultKind === 'conversion_kick_miss' ||
    resultKind === 'conversion_play_good' ||
    resultKind === 'conversion_play_miss' ||
    resultKind === 'defensive_conversion'
  ) {
    stopClock = true
    yardsGained = 0
    scoredTouchdown = false
    nextSeries = 'free_kick'
    // Scoring team kicks off; receiving team gets possession for the KO.
    const scoringIsHome = input.possessionIsHome
    const receivingIsHome = !scoringIsHome
    if (resultKind === 'conversion_kick_good') {
      outcome = 'conversion_kick_good'
      if (scoringIsHome) scoreHomeDelta = rules.conversionKickPoints
      else scoreAwayDelta = rules.conversionKickPoints
    } else if (resultKind === 'conversion_play_good') {
      outcome = 'conversion_play_good'
      if (scoringIsHome) scoreHomeDelta = rules.conversionPlayPoints
      else scoreAwayDelta = rules.conversionPlayPoints
    } else if (resultKind === 'defensive_conversion') {
      outcome = 'defensive_conversion'
      // Defense scores the two points; TD team still kicks off.
      if (scoringIsHome) scoreAwayDelta = rules.conversionPlayPoints
      else scoreHomeDelta = rules.conversionPlayPoints
    } else if (resultKind === 'conversion_kick_miss') {
      outcome = 'conversion_kick_miss'
    } else {
      outcome = 'conversion_play_miss'
    }
    applyNewSeries(rules.defaultBallOn, receivingIsHome)
  } else if (resultKind === 'incomplete') {
    // Incomplete / pass OOB: replay LOS, consume the down, clock stops.
    yardsGained = 0
    ballOn = input.playStartBallOn
    stopClock = true
    if (input.down >= rules.maxDown) {
      outcome = 'turnover_on_downs'
      const flipped = changeOfPossessionSeries({
        possessionIsHome: input.possessionIsHome,
        ballOn: input.playStartBallOn,
        rules,
      })
      applyNewSeries(flipped.ballOn, flipped.possessionIsHome)
    } else {
      outcome = 'incomplete'
      down = clampDown(input.down + 1, rules)
      distance = clampDistance(input.playStartDistance, rules)
      nextSeries = 'scrimmage'
    }
  } else if (resultKind === 'interception') {
    outcome = 'interception'
    stopClock = true
    yardsGained = input.playYardsGained
    const flipped = changeOfPossessionSeries({
      possessionIsHome: input.possessionIsHome,
      ballOn: input.ballOn,
      rules,
    })
    applyNewSeries(flipped.ballOn, flipped.possessionIsHome)
  } else if (resultKind === 'fumble_lost') {
    outcome = 'fumble_lost'
    stopClock = true
    yardsGained = input.playYardsGained
    const flipped = changeOfPossessionSeries({
      possessionIsHome: input.possessionIsHome,
      ballOn: input.ballOn,
      rules,
    })
    applyNewSeries(flipped.ballOn, flipped.possessionIsHome)
  } else if (resultKind === 'punt') {
    outcome = 'punt'
    stopClock = true
    yardsGained = input.playYardsGained
    const flipped = changeOfPossessionSeries({
      possessionIsHome: input.possessionIsHome,
      ballOn: input.ballOn,
      rules,
    })
    applyNewSeries(flipped.ballOn, flipped.possessionIsHome)
  } else {
    // yards | play_out_of_bounds — advance by yards; OOB always stops clock.
    const forceStop = resultKind === 'play_out_of_bounds'
    const firstDown = yardsGained >= input.playStartDistance
    if (firstDown) {
      outcome = 'first_down'
      down = rules.minDown
      distance = distanceForNewSeries(input.ballOn, rules)
      ballOn = input.ballOn
      // NCAA DI/DII (2023+): 1st down keeps clock running except last 2:00 of half / OOB.
      stopClock =
        forceStop ||
        awardedFirstDownStopsClock({
          period: input.clockPeriod,
          seconds: input.clockSeconds,
        })
      nextSeries = 'scrimmage'
    } else if (input.down >= rules.maxDown) {
      outcome = 'turnover_on_downs'
      stopClock = true
      const flipped = changeOfPossessionSeries({
        possessionIsHome: input.possessionIsHome,
        ballOn: input.ballOn,
        rules,
      })
      applyNewSeries(flipped.ballOn, flipped.possessionIsHome)
    } else {
      outcome = 'next_down'
      down = clampDown(input.down + 1, rules)
      distance = clampDistance(input.playStartDistance - yardsGained, rules)
      ballOn = input.ballOn
      // In-bounds tackle short of the sticks — clock keeps running unless OOB.
      stopClock = forceStop
      nextSeries = 'scrimmage'
    }
  }

  const description = describeEndedPlay({ yardsGained, outcome })
  const play: PlayEntry = {
    id: input.playId ?? crypto.randomUUID(),
    quarter: input.clockPeriod,
    down: input.playStartDown,
    distance: input.playStartDistance,
    ballOn: formatBallOn(
      input.possessionIsHome,
      resultKind === 'incomplete' ? input.playStartBallOn : input.ballOn,
      input.homeAbbr,
      input.awayAbbr,
      rules,
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
    stopClock,
    scoreHomeDelta,
    scoreAwayDelta,
    scoredTouchdown,
    nextSeries,
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
  playStartBallOn: number
  playCollectionPath?: readonly string[]
  playId?: string
  rules?: RulesetRef
}): ResolveEndedPlayResult {
  return resolveEndedPlay({
    down: params.down,
    distance: params.distance,
    ballOn: params.ballOn,
    possessionIsHome: params.possessionIsHome,
    playYardsGained: params.playYardsGained,
    playStartDown: params.playStartDown,
    playStartDistance: params.playStartDistance,
    playStartBallOn: params.playStartBallOn,
    playCollectionPath: params.playCollectionPath,
    clockPeriod: params.clockPeriod,
    clockSeconds: params.clockSeconds,
    homeAbbr: params.fixture.homeAbbr,
    awayAbbr: params.fixture.awayAbbr,
    playId: params.playId,
    rules: params.rules,
  })
}
