import type { CollectedDatapoint, GameState, SeriesKind } from '@/types'
import { formatClock } from '@/lib/format'
import { labelForUndo } from './datapointLabels'
import type { PlayCollectionStepId } from './playCollectionFlow'

/** Snapshot of play-control-relevant game fields for one undo step. */
export interface PlayUndoSnapshot {
  playInProgress: boolean
  seriesKind: SeriesKind
  playCollectionStep: PlayCollectionStepId | null
  playCollectionPath: string[]
  playYardsGained: number
  ballOn: number
  distance: number
  down: number
  possessionIsHome: boolean
  playStartDown: number
  playStartDistance: number
  playStartBallOn: number
  score: { home: number; away: number }
  clock: { seconds: number; period: number; running: boolean }
  gameStarted: boolean
  gameEnded: boolean
  periodEnded: boolean
  collectedDatapointsLength: number
  playsLength: number
  flagEventsLength: number
  flagResume: GameState['flagResume']
}

const MAX_UNDO = 40

export function capturePlayUndoSnapshot(game: GameState): PlayUndoSnapshot {
  return {
    playInProgress: game.playInProgress,
    seriesKind: game.seriesKind,
    playCollectionStep: game.playCollectionStep,
    playCollectionPath: [...game.playCollectionPath],
    playYardsGained: game.playYardsGained,
    ballOn: game.ballOn,
    distance: game.distance,
    down: game.down,
    possessionIsHome: game.possessionIsHome,
    playStartDown: game.playStartDown,
    playStartDistance: game.playStartDistance,
    playStartBallOn: game.playStartBallOn,
    score: { ...game.score },
    clock: { ...game.clock },
    gameStarted: game.gameStarted,
    gameEnded: game.gameEnded,
    periodEnded: game.periodEnded,
    collectedDatapointsLength: game.collectedDatapoints?.length ?? 0,
    playsLength: game.plays?.length ?? 0,
    flagEventsLength: game.flagEvents?.length ?? 0,
    flagResume: game.flagResume
      ? {
          playInProgress: game.flagResume.playInProgress,
          playCollectionStep: game.flagResume.playCollectionStep,
          playCollectionPath: [...game.flagResume.playCollectionPath],
        }
      : null,
  }
}

export function pushPlayUndoSnapshot(
  game: GameState,
  snapshot: PlayUndoSnapshot = capturePlayUndoSnapshot(game),
): GameState {
  const stack = [...(game.playUndoStack ?? []), snapshot]
  if (stack.length > MAX_UNDO) stack.splice(0, stack.length - MAX_UNDO)
  return { ...game, playUndoStack: stack }
}

export function applyPlayUndoSnapshot(
  game: GameState,
  snapshot: PlayUndoSnapshot,
): GameState {
  const prior = game.collectedDatapoints ?? []
  const undone = prior.slice(snapshot.collectedDatapointsLength)
  // Skip nested undo markers when labeling what was reversed.
  const undoneLabels = undone
    .filter((entry) => entry.key !== 'undo')
    .map((entry) => entry.label)

  const undoEntry: CollectedDatapoint = {
    id: crypto.randomUUID(),
    key: 'undo',
    label: labelForUndo(undoneLabels),
    period: game.clock.period,
    clock: formatClock(game.clock.seconds),
    collectedAt: Date.now(),
  }

  return {
    ...game,
    playInProgress: snapshot.playInProgress,
    seriesKind: snapshot.seriesKind,
    playCollectionStep: snapshot.playCollectionStep,
    playCollectionPath: [...snapshot.playCollectionPath],
    playYardsGained: snapshot.playYardsGained,
    ballOn: snapshot.ballOn,
    distance: snapshot.distance,
    down: snapshot.down,
    possessionIsHome: snapshot.possessionIsHome,
    playStartDown: snapshot.playStartDown,
    playStartDistance: snapshot.playStartDistance,
    playStartBallOn: snapshot.playStartBallOn,
    score: { ...snapshot.score },
    clock: { ...snapshot.clock },
    gameStarted: snapshot.gameStarted,
    gameEnded: snapshot.gameEnded,
    periodEnded: snapshot.periodEnded,
    // Keep history — append Undo instead of deleting reversed datapoints.
    collectedDatapoints: [...prior, undoEntry],
    plays: (game.plays ?? []).slice(0, snapshot.playsLength),
    flagEvents: (game.flagEvents ?? []).slice(0, snapshot.flagEventsLength ?? 0),
    flagResume: snapshot.flagResume
      ? {
          playInProgress: snapshot.flagResume.playInProgress,
          playCollectionStep: snapshot.flagResume.playCollectionStep,
          playCollectionPath: [...snapshot.flagResume.playCollectionPath],
        }
      : null,
    simulation: game.simulation
      ? { ...game.simulation, offenseIsHome: snapshot.possessionIsHome }
      : game.simulation,
    playUndoStack: (game.playUndoStack ?? []).slice(0, -1),
  }
}

export function canUndoPlayAction(game: GameState | undefined): boolean {
  return Boolean(game && !game.gameEnded && (game.playUndoStack?.length ?? 0) > 0)
}
