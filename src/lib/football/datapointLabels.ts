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
  recovery_receiving: 'Recovery',
  recovery_kicking: 'Recovery',
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
}

export function labelForDatapointKey(key: string): string {
  return DATAPOINT_LABELS[key] ?? key
}

/** One collected datapoint per yard-button press (not a running total). */
export function labelForYardsDelta(delta: number): string {
  if (delta === 0) return 'Yards(0)'
  return `Yards(${delta > 0 ? '+' : ''}${delta})`
}
