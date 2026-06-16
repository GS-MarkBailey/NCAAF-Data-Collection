export const QUARTER_LENGTH_SECONDS = 15 * 60
export const DEMO_CLOCK_SECONDS = 30
export const REGULATION_QUARTERS = 4

export function isAwaitingQuarterStart(clock: {
  seconds: number
  period: number
}): boolean {
  return clock.seconds === 0 && clock.period < REGULATION_QUARTERS
}

export function isRegulationComplete(clock: {
  seconds: number
  period: number
}): boolean {
  return clock.seconds === 0 && clock.period >= REGULATION_QUARTERS
}

export function nextQuarterNumber(period: number): number {
  return period + 1
}
