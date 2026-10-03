import { FIELD_LENGTH_YARDS } from './possession'
import { clampBallOn } from './ballOn'

/** Format offense-relative ball-on for play-by-play (e.g. "CONC 25"). */
export function formatBallOn(
  offenseIsHome: boolean,
  yardsFromOwnGoal: number,
  homeAbbr: string,
  awayAbbr: string,
): string {
  const yards = clampBallOn(yardsFromOwnGoal)
  if (yards <= 50) {
    return `${offenseIsHome ? homeAbbr : awayAbbr} ${yards}`
  }
  const oppYards = FIELD_LENGTH_YARDS - yards
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
  const yards = clampBallOn(yardsFromOwnGoal)
  return offenseIsHome ? yards : FIELD_LENGTH_YARDS - yards
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
  yardsFromHomeGoalValue: number,
  homeAttacksRight: boolean,
): BallOnDisplay {
  const yards = clampBallOn(yardsFromHomeGoalValue)
  const onHomeSide = yards <= 50
  const homeSideArrow: BallOnArrowSide = homeAttacksRight ? 'right' : 'left'
  const awaySideArrow: BallOnArrowSide = homeAttacksRight ? 'left' : 'right'

  return {
    yardLine: onHomeSide ? yards : FIELD_LENGTH_YARDS - yards,
    arrowSide: onHomeSide ? homeSideArrow : awaySideArrow,
  }
}

/** Display yard line (1–50) from offense-relative field position. */
export function getBallOnYardLine(yardsFromOwnGoal: number): number {
  const yards = clampBallOn(yardsFromOwnGoal)
  return yards <= 50 ? yards : FIELD_LENGTH_YARDS - yards
}
