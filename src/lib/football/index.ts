/**
 * American football match / play rules (pure helpers).
 *
 * Zustand (`gameStore`) owns session state + action logs; this package owns
 * field geometry, down/distance, live-play resolution, period workflow, and
 * demo simulation so other surfaces can reuse the same rules later.
 */

export * from './ballOn'
export * from './downDistance'
export * from './possession'
export * from './field'
export * from './clock'
export * from './play'
export {
  createInitialSimulation,
  createQuarterStartPlay,
  simulateLivePlay,
  tickPlaySimulation,
  type SimulatedPlayResult,
} from './simulation'
