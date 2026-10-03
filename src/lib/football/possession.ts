import { clampBallOn } from './ballOn'

/** Field length used for absolute ↔ offense-relative yard conversion. */
export const FIELD_LENGTH_YARDS = 100

/**
 * `ballOn` is yards from the *offense’s* own goal (1–99).
 * Absolute yards are measured from the home team’s goal.
 */
export function toAbsoluteYards(
  possessionIsHome: boolean,
  ballOn: number,
): number {
  return possessionIsHome ? ballOn : FIELD_LENGTH_YARDS - ballOn
}

export function toOffenseBallOn(
  possessionIsHome: boolean,
  absoluteYards: number,
): number {
  return clampBallOn(
    possessionIsHome ? absoluteYards : FIELD_LENGTH_YARDS - absoluteYards,
  )
}

/** Flip possession while keeping the ball at the same absolute field spot. */
export function flipPossessionAtSpot(params: {
  possessionIsHome: boolean
  ballOn: number
}): { possessionIsHome: boolean; ballOn: number } {
  const absoluteYards = toAbsoluteYards(params.possessionIsHome, params.ballOn)
  const possessionIsHome = !params.possessionIsHome
  return {
    possessionIsHome,
    ballOn: toOffenseBallOn(possessionIsHome, absoluteYards),
  }
}

/** Re-express ball-on for a new offense without moving the ball on the field. */
export function ballOnForPossession(params: {
  currentPossessionIsHome: boolean
  nextPossessionIsHome: boolean
  ballOn: number
}): number {
  if (params.currentPossessionIsHome === params.nextPossessionIsHome) {
    return clampBallOn(params.ballOn)
  }
  const absoluteYards = toAbsoluteYards(
    params.currentPossessionIsHome,
    params.ballOn,
  )
  return toOffenseBallOn(params.nextPossessionIsHome, absoluteYards)
}
