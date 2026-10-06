/**
 * American football match / play rules (pure helpers).
 *
 * Zustand (`gameStore`) owns session state + action logs; this package owns
 * league rulesets (NCAA / NFL / CFL), field geometry, down/distance, live-play
 * resolution, period workflow, and demo simulation so UI modules can reuse
 * the same logic without coupling.
 */

export * from './rulesets'
export * from './ballOn'
export * from './downDistance'
export * from './possession'
export * from './field'
export * from './clock'
export * from './clockContract'
export * from './flagRules'
export * from './play'
export * from './matchState'
export * from './playCollectionFlow'
export * from './playUndo'
export * from './datapointLabels'
export * from './catalog'
export {
  createInitialSimulation,
  createQuarterStartPlay,
  simulateLivePlay,
  tickPlaySimulation,
  type SimulatedPlayResult,
} from './simulation'
