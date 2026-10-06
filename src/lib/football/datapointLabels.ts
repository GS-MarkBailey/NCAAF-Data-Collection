/**
 * Keys credited to the defense on scrimmage (opposite of possession).
 */
import { getFlagType, type FlagTypeId } from './flagRules'

const DEFENSE_KEYS = new Set([
  'interception',
  'recovery_defense',
  'defensive_two_point',
])

/**
 * Kickoff-tree keys credited to the *kicking* team.
 * During free-kick collection, possession is the receiving team.
 */
const KICKOFF_KICKING_KEYS = new Set(['kickoff', 'recovery_kicking'])

/** Display labels for progressive collection option ids. */
const DATAPOINT_LABELS: Record<string, string> = {
  kickoff: 'Kickoff',
  return: 'Return',
  touchback: 'Touchback',
  fair_catch: 'FairCatch',
  kick_out_of_bounds: 'OutOfBounds',
  muff: 'Muff',
  tackle: 'Tackle',
  return_out_of_bounds: 'OutOfBounds',
  return_fumble: 'Fumble',
  return_touchdown: 'Touchdown',
  recovery_receiving: 'RecoveryReceiving',
  recovery_kicking: 'RecoveryKicking',
  recovery_offense: 'RecoveryOffense',
  recovery_defense: 'RecoveryDefense',
  rush: 'Run',
  throw: 'PassAttempt',
  punt: 'Punt',
  catch: 'CompletePass',
  incomplete: 'IncompletePass',
  out_of_bounds: 'OutOfBounds',
  play_out_of_bounds: 'OutOfBounds',
  interception: 'Interception',
  play_fumble: 'Fumble',
  touchdown: 'Touchdown',
  snap: 'Snap',
  end_play: 'EndPlay',
  yards: 'Yards',
  try: 'Try',
  pat_kick: 'ConversionKick',
  two_point: 'TwoPoint',
  pat_good: 'PatGood',
  pat_no_good: 'PatNoGood',
  two_point_good: 'TwoPointGood',
  two_point_no_good: 'TwoPointNoGood',
  defensive_two_point: 'DefensiveConversion',
  undo: 'Undo',
  flag: 'Flag',
  flag_accept: 'FlagAccepted',
  flag_decline: 'FlagDeclined',
  flag_offense: 'Offense',
  flag_defense: 'Defense',
  flag_kicking: 'Kicking',
  flag_receiving: 'Receiving',
  flag_cat_pre_snap: 'Procedure',
  flag_cat_clock: 'Clock',
  flag_cat_line: 'HoldingBlock',
  flag_cat_pass: 'Pass',
  flag_cat_personal: 'Personal',
  flag_cat_kick: 'Kick',
  flag_cat_unsportsmanlike: 'Conduct',
  flag_cat_substitution: 'Substitution',
  flag_cat_other: 'Other',
}

export function labelForDatapointKey(key: string): string {
  if (DATAPOINT_LABELS[key]) return DATAPOINT_LABELS[key]
  if (key.startsWith('flag.')) {
    const type = getFlagType(key as FlagTypeId)
    if (type) {
      return type.label.replace(/[^a-zA-Z0-9]+/g, '')
    }
  }
  return key
}

/** Team abbr credited for a datapoint given current possession / kickoff context. */
export function teamAbbrForDatapoint(
  key: string,
  possessionIsHome: boolean,
  homeAbbr: string,
  awayAbbr: string,
  playCollectionPath: readonly string[] = [],
): string {
  const onKickoff =
    key === 'kickoff' || playCollectionPath.includes('kickoff')

  let creditHome = possessionIsHome

  if (onKickoff) {
    // Possession = receiving; kickoff / kicking recovery → kicking team.
    if (KICKOFF_KICKING_KEYS.has(key)) {
      creditHome = !possessionIsHome
    }
  } else if (DEFENSE_KEYS.has(key)) {
    creditHome = !possessionIsHome
  }

  return creditHome ? homeAbbr : awayAbbr
}

/** e.g. Touchdown - MISS */
export function labelForDatapointWithTeam(
  key: string,
  teamAbbr: string,
): string {
  return `${labelForDatapointKey(key)} - ${teamAbbr}`
}

/** Label for an undo datapoint that references what was reversed. */
export function labelForUndo(undoneLabels: readonly string[]): string {
  if (undoneLabels.length === 0) return 'Undo'
  if (undoneLabels.length === 1) return `Undo(${undoneLabels[0]})`
  return `Undo(${undoneLabels.join(', ')})`
}

/** One collected datapoint per yard-button press (not a running total). */
export function labelForYardsDelta(delta: number): string {
  if (delta === 0) return 'Yards(0)'
  return `Yards(${delta > 0 ? '+' : ''}${delta})`
}

export function labelForYardsDeltaWithTeam(
  delta: number,
  teamAbbr: string,
): string {
  return `${labelForYardsDelta(delta)} - ${teamAbbr}`
}
