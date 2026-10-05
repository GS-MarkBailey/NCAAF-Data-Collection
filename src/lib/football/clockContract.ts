/**
 * Clock start/stop contract for the collection console (NCAAF-first).
 *
 * All store mutations that change `clock.running` MUST go through
 * `nextClockRunning` — do not set `running: true/false` ad hoc in UI or store.
 *
 * Product rules (operator collection, not full referee mechanics):
 * - Kickoff button opens kickoff collection — clock stays STOPPED.
 * - SNAP starts the game clock (when time remains).
 * - END PLAY stops the clock when resolution says so (incomplete, OOB,
 *   change of possession, kickoff dead ball, awarded 1st down only in the
 *   last 2:00 of either half, etc.).
 * - Manual Start/Pause on the scoreboard remains an operator override
 *   (toggleClock) and is outside this automatic contract.
 */

export type ClockContractEvent =
  | { type: 'kickoff_opened' }
  | { type: 'snap' }
  | { type: 'play_ended'; stopClock: boolean }
  | { type: 'period_opened' }
  | { type: 'overtime_opened' }
  | { type: 'game_ended' }
  | { type: 'period_ended' }

/**
 * NCAA DI/DII (2023+): an awarded first down does **not** stop the game clock
 * except in the last two minutes of either half (end of Q2 / Q4).
 */
export function awardedFirstDownStopsClock(clock: {
  period: number
  seconds: number
}): boolean {
  const endOfHalf = clock.period === 2 || clock.period === 4
  return endOfHalf && clock.seconds <= 120
}

export function nextClockRunning(
  event: ClockContractEvent,
  clock: { seconds: number; running: boolean },
): boolean {
  switch (event.type) {
    case 'kickoff_opened':
      // Collect Return / Touchback / … before the clock runs.
      return false
    case 'snap':
      return clock.seconds > 0 ? true : clock.running
    case 'play_ended':
      return event.stopClock ? false : clock.running
    case 'period_opened':
    case 'overtime_opened':
      // Next period is ready; clock starts on SNAP (or manual Start).
      return false
    case 'period_ended':
    case 'game_ended':
      return false
  }
}
