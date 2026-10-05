import { create } from 'zustand'
import type { CollectedDatapoint, Fixture, GameState, RiskType } from '@/types'
import type { ActionLogsByFixture, UserAction } from '@/types/actions'
import { FIXTURES, createGameStateForFixture } from '@/data/fixtures'
import { appendAction, createUserAction } from '@/lib/actionLog'
import { formatClock } from '@/lib/format'
import {
  adjustLivePlayYards,
  applyYardDelta,
  ballOnForPossession,
  canEndCurrentPeriod,
  canStartNextPeriod,
  canStartOvertime,
  clampDistance,
  clampDown,
  clampPeriod,
  createInitialSimulation,
  createQuarterStartPlay,
  INITIAL_KICKOFF_COLLECTION_STEP,
  INITIAL_PLAY_COLLECTION_STEP,
  INITIAL_TRY_COLLECTION_STEP,
  TRY_SPOT_BALL_ON,
  applyMatchTransition,
  applyPlayUndoSnapshot,
  canUndoPlayAction,
  getFootballRuleset,
  isAwaitingRegulationDecision,
  isOvertimePeriod,
  labelForDatapointKey,
  labelForYardsDelta,
  nextClockRunning,
  pushPlayUndoSnapshot,
  resolveEndedPlayFromGame,
  resolvePlayCollectionChoice,
  startLivePlay,
  tickPlaySimulation,
  toMatchStateInput,
} from '@/lib/football'

interface AppStore {
  fixtures: Fixture[]
  games: Record<string, GameState>
  actionLogs: ActionLogsByFixture

  initGame: (fixtureId: string) => void
  refreshFixtures: () => Promise<void>
  getGame: (fixtureId: string) => GameState | undefined
  getActionLog: (fixtureId: string) => UserAction[]

  toggleTakeControl: (fixtureId: string) => void
  toggleRisk: (fixtureId: string, risk: RiskType) => void
  toggleClock: (fixtureId: string) => void
  adjustClock: (fixtureId: string, delta: number) => void
  setClockTime: (fixtureId: string, seconds: number) => void
  setClockPeriod: (fixtureId: string, period: number) => void
  setDown: (fixtureId: string, down: number) => void
  setDistance: (fixtureId: string, distance: number) => void
  snapPlay: (fixtureId: string) => void
  endPlay: (fixtureId: string, options?: { skipUndoPush?: boolean }) => void
  adjustYards: (fixtureId: string, delta: number) => void
  /** Advance progressive play-collection (rush/throw → result → …). */
  selectPlayCollectionOption: (fixtureId: string, optionId: string) => void
  /** Restore the previous play-controls action (collection / yards / snap / end). */
  undoPlayControl: (fixtureId: string) => void
  startPeriod: (fixtureId: string) => void
  endPeriod: (fixtureId: string) => void
  startOvertime: (fixtureId: string) => void
  endGame: (fixtureId: string) => void
  startNextQuarter: (fixtureId: string) => void
  setPossession: (fixtureId: string, possessionIsHome: boolean) => void
  setHomeAttacksRight: (fixtureId: string, homeAttacksRight: boolean) => void
  tickClock: (fixtureId: string) => void
}

const EMPTY_ACTIONS: UserAction[] = []

function updateGame(
  games: Record<string, GameState>,
  fixtureId: string,
  updater: (game: GameState) => GameState,
): Record<string, GameState> {
  const game = games[fixtureId]
  if (!game) return games
  return { ...games, [fixtureId]: updater(game) }
}

function appendCollectedDatapoint(
  game: GameState,
  key: string,
): CollectedDatapoint[] {
  const entry: CollectedDatapoint = {
    id: crypto.randomUUID(),
    key,
    label: labelForDatapointKey(key),
    period: game.clock.period,
    clock: formatClock(game.clock.seconds),
    collectedAt: Date.now(),
  }
  return [...(game.collectedDatapoints ?? []), entry]
}

export const useAppStore = create<AppStore>((set, get) => ({
  fixtures: FIXTURES,
  games: {},
  actionLogs: {},

  initGame: (fixtureId) => {
    const fixture = FIXTURES.find((f) => f.id === fixtureId)
    if (!fixture) return
    set((state) => ({
      games: {
        ...state.games,
        [fixtureId]: createGameStateForFixture(fixture),
      },
      actionLogs: {
        ...state.actionLogs,
        [fixtureId]: [],
      },
    }))
  },

  refreshFixtures: async () => {
    await new Promise<void>((resolve) => {
      window.setTimeout(() => {
        set({ fixtures: [...FIXTURES] })
        resolve()
      }, 350)
    })
  },

  getGame: (fixtureId) => get().games[fixtureId],

  getActionLog: (fixtureId) => get().actionLogs[fixtureId] ?? EMPTY_ACTIONS,

  toggleTakeControl: (fixtureId) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game) return state
      const active = !game.takeControlActive
      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          takeControlActive: active,
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'take_control',
              payload: { active },
            },
            { seconds: game.clock.seconds, period: game.clock.period },
          ),
        ),
      }
    })
  },

  toggleRisk: (fixtureId, risk) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game) return state
      const active = !game.risks[risk]
      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          risks: { ...g.risks, [risk]: active },
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'risk_toggle',
              payload: { risk, active },
            },
            { seconds: game.clock.seconds, period: game.clock.period },
          ),
        ),
      }
    })
  },

  toggleClock: (fixtureId) => {
    const game = get().games[fixtureId]
    if (!game || game.gameEnded) return

    // After End period, Start clock advances into the next quarter.
    if (
      canStartNextPeriod(
        game.gameStarted,
        game.gameEnded,
        game.periodEnded,
        game.clock,
        game.rulesetId,
      )
    ) {
      get().startPeriod(fixtureId)
      return
    }

    if (game.clock.seconds <= 0) return

    set((state) => {
      const current = state.games[fixtureId]
      if (!current || current.gameEnded || current.clock.seconds <= 0) {
        return state
      }

      const clockBefore = {
        seconds: current.clock.seconds,
        period: current.clock.period,
      }

      const running = !current.clock.running
      const seconds = current.clock.seconds
      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          clock: { ...g.clock, running },
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'clock_toggle',
              payload: { running, seconds },
            },
            clockBefore,
          ),
        ),
      }
    })
  },

  adjustClock: (fixtureId, delta) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game) return state
      const seconds = Math.max(0, game.clock.seconds + delta)
      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }
      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          clock: { ...g.clock, seconds },
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'clock_adjust',
              payload: { delta, seconds },
            },
            clockBefore,
          ),
        ),
      }
    })
  },

  setClockTime: (fixtureId, seconds) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game) return state

      const nextSeconds = Math.max(0, seconds)
      if (nextSeconds === game.clock.seconds) return state

      const delta = nextSeconds - game.clock.seconds
      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          periodEnded: nextSeconds > 0 ? false : g.periodEnded,
          clock: { ...g.clock, seconds: nextSeconds },
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'clock_adjust',
              payload: { delta, seconds: nextSeconds },
            },
            clockBefore,
          ),
        ),
      }
    })
  },

  setClockPeriod: (fixtureId, period) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game) return state

      const toPeriod = clampPeriod(period)
      if (toPeriod === game.clock.period) return state

      const fromPeriod = game.clock.period
      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          clock: { ...g.clock, period: toPeriod },
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'period_set',
              payload: { fromPeriod, toPeriod },
            },
            clockBefore,
          ),
        ),
      }
    })
  },

  setDown: (fixtureId, down) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || game.gameEnded) return state

      const toDown = clampDown(down, game.rulesetId)
      if (toDown === game.down) return state

      const fromDown = game.down
      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          down: toDown,
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'down_set',
              payload: { fromDown, toDown },
            },
            clockBefore,
          ),
        ),
      }
    })
  },

  setDistance: (fixtureId, distance) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || game.gameEnded) return state

      const toDistance = clampDistance(distance, game.rulesetId)
      if (toDistance === game.distance) return state

      const fromDistance = game.distance
      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          distance: toDistance,
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'distance_set',
              payload: { fromDistance, toDistance },
            },
            clockBefore,
          ),
        ),
      }
    })
  },

  snapPlay: (fixtureId) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (
        !game ||
        game.gameEnded ||
        !game.gameStarted ||
        game.playInProgress ||
        game.seriesKind !== 'scrimmage'
      ) {
        return state
      }

      const snap = startLivePlay({
        down: game.down,
        distance: game.distance,
        ballOn: game.ballOn,
      })
      const match = applyMatchTransition(toMatchStateInput(game), {
        type: 'snap',
      })
      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => {
          const withUndo = pushPlayUndoSnapshot(g)
          return {
            ...withUndo,
            ...snap,
            seriesKind: match.seriesKind,
            playInProgress: match.playInProgress,
            playCollectionStep: INITIAL_PLAY_COLLECTION_STEP,
            playCollectionPath: [],
            collectedDatapoints: appendCollectedDatapoint(withUndo, 'snap'),
            clock: {
              ...withUndo.clock,
              running: nextClockRunning({ type: 'snap' }, withUndo.clock),
            },
          }
        }),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'play_snap',
              payload: {
                down: game.down,
                distance: game.distance,
                ballOn: game.ballOn,
              },
            },
            clockBefore,
          ),
        ),
      }
    })
  },

  selectPlayCollectionOption: (fixtureId, optionId) => {
    let shouldAutoEnd = false
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || game.gameEnded || !game.playInProgress) return state
      const stepId = game.playCollectionStep
      if (!stepId) return state

      const resolved = resolvePlayCollectionChoice(
        stepId,
        optionId,
        game.playCollectionPath,
      )
      if (!resolved) return state

      shouldAutoEnd = resolved.autoEndPlay

      return {
        games: updateGame(state.games, fixtureId, (g) => {
          const withUndo = pushPlayUndoSnapshot(g)
          const path = [...withUndo.playCollectionPath, optionId]
          return {
            ...withUndo,
            playCollectionStep: resolved.nextStep,
            playCollectionPath: path,
            collectedDatapoints: appendCollectedDatapoint(withUndo, optionId),
          }
        }),
      }
    })
    // Terminal choices without a yards pause (incomplete, PAT good, TD, …).
    // One undo step covers the selection + auto END PLAY.
    if (shouldAutoEnd) {
      get().endPlay(fixtureId, { skipUndoPush: true })
    }
  },

  adjustYards: (fixtureId, delta) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || game.gameEnded || delta === 0) {
        return state
      }

      // Live play: move ball + accumulate play yards. Between plays: spot only.
      const adjusted = game.playInProgress
        ? adjustLivePlayYards({
            ballOn: game.ballOn,
            distance: game.distance,
            playYardsGained: game.playYardsGained,
            delta,
            rules: game.rulesetId,
          })
        : {
            ...applyYardDelta({
              ballOn: game.ballOn,
              distance: game.distance,
              delta,
              rules: game.rulesetId,
            }),
            actualDelta: 0,
            playYardsGained: game.playYardsGained,
          }

      const actualDelta = game.playInProgress
        ? adjusted.actualDelta
        : adjusted.ballOn - game.ballOn
      if (actualDelta === 0) return state

      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => {
          const withUndo = pushPlayUndoSnapshot(g)
          const yardPoint: CollectedDatapoint = {
            id: crypto.randomUUID(),
            key: 'yards',
            label: labelForYardsDelta(actualDelta),
            period: withUndo.clock.period,
            clock: formatClock(withUndo.clock.seconds),
            collectedAt: Date.now(),
          }
          return {
            ...withUndo,
            ballOn: adjusted.ballOn,
            distance: adjusted.distance,
            playYardsGained: adjusted.playYardsGained,
            collectedDatapoints: [
              ...(withUndo.collectedDatapoints ?? []),
              yardPoint,
            ],
          }
        }),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'yards_adjust',
              payload: {
                delta: actualDelta,
                yardsGained: adjusted.playYardsGained,
                ballOn: adjusted.ballOn,
                distance: adjusted.distance,
              },
            },
            clockBefore,
          ),
        ),
      }
    })
  },

  undoPlayControl: (fixtureId) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!canUndoPlayAction(game)) return state
      const stack = game!.playUndoStack
      const snapshot = stack[stack.length - 1]
      if (!snapshot) return state
      return {
        games: updateGame(state.games, fixtureId, (g) =>
          applyPlayUndoSnapshot(g, snapshot),
        ),
      }
    })
  },

  endPlay: (fixtureId, options) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || game.gameEnded || !game.playInProgress) return state

      const path = game.playCollectionPath
      const endingTry = game.seriesKind === 'try'
      // Don't resolve a try until a convert result is collected.
      if (
        endingTry &&
        !path.some((id) =>
          [
            'pat_good',
            'pat_no_good',
            'two_point_good',
            'two_point_no_good',
            'defensive_two_point',
          ].includes(id),
        )
      ) {
        return state
      }
      // Don't resolve kickoff until a result datapoint exists.
      if (
        game.seriesKind === 'free_kick' &&
        path.length > 0 &&
        path.every((id) => id === 'kickoff')
      ) {
        return state
      }

      const resolved = resolveEndedPlayFromGame({
        fixture: game.fixture,
        clockPeriod: game.clock.period,
        clockSeconds: game.clock.seconds,
        down: game.down,
        distance: game.distance,
        ballOn: game.ballOn,
        possessionIsHome: game.possessionIsHome,
        playYardsGained: game.playYardsGained,
        playStartDown: game.playStartDown,
        playStartDistance: game.playStartDistance,
        playStartBallOn: game.playStartBallOn,
        playCollectionPath: path,
        rules: game.rulesetId,
      })

      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      const match = applyMatchTransition(
        toMatchStateInput(game),
        endingTry
          ? { type: 'try_resolved' }
          : {
              type: 'end_play',
              scoredTouchdown: resolved.scoredTouchdown,
              nextSeries: resolved.nextSeries,
            },
      )

      const skipUndoPush = Boolean(options?.skipUndoPush)

      return {
        games: updateGame(state.games, fixtureId, (g) => {
          const withUndo = skipUndoPush ? g : pushPlayUndoSnapshot(g)
          const withEnd = appendCollectedDatapoint(withUndo, 'end_play')
          const base = {
            ...withUndo,
            playYardsGained: resolved.playYardsGained,
            seriesKind: match.seriesKind,
            down: resolved.down,
            distance: resolved.distance,
            ballOn: resolved.ballOn,
            possessionIsHome: resolved.possessionIsHome,
            score: {
              home: withUndo.score.home + resolved.scoreHomeDelta,
              away: withUndo.score.away + resolved.scoreAwayDelta,
            },
            clock: {
              ...withUndo.clock,
              running: nextClockRunning(
                { type: 'play_ended', stopClock: resolved.stopClock },
                withUndo.clock,
              ),
            },
            simulation: withUndo.simulation
              ? {
                  ...withUndo.simulation,
                  offenseIsHome: resolved.possessionIsHome,
                }
              : withUndo.simulation,
            plays: [...withUndo.plays, resolved.play],
          }

          // Touchdown → open try/convert collection (1-pt / 2-pt).
          if (resolved.scoredTouchdown) {
            return {
              ...base,
              playInProgress: true,
              seriesKind: 'try',
              ballOn: TRY_SPOT_BALL_ON,
              playStartBallOn: TRY_SPOT_BALL_ON,
              playStartDown: resolved.down,
              playStartDistance: resolved.distance,
              playCollectionStep: INITIAL_TRY_COLLECTION_STEP,
              playCollectionPath: ['try'],
              collectedDatapoints: [
                ...withEnd,
                {
                  id: crypto.randomUUID(),
                  key: 'try',
                  label: labelForDatapointKey('try'),
                  period: withUndo.clock.period,
                  clock: formatClock(withUndo.clock.seconds),
                  collectedAt: Date.now(),
                },
              ],
            }
          }

          // Try resolved → open ensuing kickoff collection.
          if (endingTry) {
            return {
              ...base,
              playInProgress: true,
              seriesKind: 'free_kick',
              playCollectionStep: INITIAL_KICKOFF_COLLECTION_STEP,
              playCollectionPath: ['kickoff'],
              playStartBallOn: resolved.ballOn,
              playStartDown: resolved.down,
              playStartDistance: resolved.distance,
              collectedDatapoints: [
                ...withEnd,
                {
                  id: crypto.randomUUID(),
                  key: 'kickoff',
                  label: labelForDatapointKey('kickoff'),
                  period: withUndo.clock.period,
                  clock: formatClock(withUndo.clock.seconds),
                  collectedAt: Date.now(),
                },
              ],
              clock: {
                ...base.clock,
                running: nextClockRunning(
                  { type: 'kickoff_opened' },
                  base.clock,
                ),
              },
            }
          }

          return {
            ...base,
            playInProgress: match.playInProgress,
            playCollectionStep: null,
            playCollectionPath: [],
            collectedDatapoints: withEnd,
          }
        }),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'play_end',
              payload: {
                yardsGained: resolved.yardsGained,
                down: resolved.down,
                distance: resolved.distance,
                ballOn: resolved.ballOn,
                description: resolved.description,
              },
            },
            clockBefore,
          ),
        ),
      }
    })
  },

  startPeriod: (fixtureId) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game) return state

      const rules = getFootballRuleset(game.rulesetId)
      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      if (!game.gameStarted) {
        const match = applyMatchTransition(toMatchStateInput(game), {
          type: 'game_started',
        })
        const spot = rules.defaultBallOn
        return {
          games: updateGame(state.games, fixtureId, (g) => {
            const withUndo = pushPlayUndoSnapshot(g)
            return {
              ...withUndo,
              gameStarted: match.gameStarted,
              periodEnded: match.periodEnded,
              playInProgress: match.playInProgress,
              seriesKind: match.seriesKind,
              playCollectionStep: INITIAL_KICKOFF_COLLECTION_STEP,
              playCollectionPath: ['kickoff'],
              collectedDatapoints: [
                ...(withUndo.collectedDatapoints ?? []),
                {
                  id: crypto.randomUUID(),
                  key: 'kickoff',
                  label: labelForDatapointKey('kickoff'),
                  period: 1,
                  clock: formatClock(rules.quarterLengthSeconds),
                  collectedAt: Date.now(),
                },
              ],
              playYardsGained: 0,
              playStartDown: rules.minDown,
              playStartDistance: rules.firstDownDistance,
              playStartBallOn: spot,
              ballOn: spot,
              down: rules.minDown,
              distance: rules.firstDownDistance,
              clock: {
                period: 1,
                seconds: rules.quarterLengthSeconds,
                running: nextClockRunning(
                  { type: 'kickoff_opened' },
                  { seconds: rules.quarterLengthSeconds, running: false },
                ),
              },
              plays: [...withUndo.plays, createQuarterStartPlay(withUndo, 1)],
            }
          }),
          actionLogs: appendAction(
            state.actionLogs,
            createUserAction(
              fixtureId,
              {
                type: 'quarter_start',
                payload: {
                  fromPeriod: 0,
                  toPeriod: 1,
                  seconds: rules.quarterLengthSeconds,
                },
              },
              clockBefore,
            ),
          ),
        }
      }

      if (
        !canStartNextPeriod(
          game.gameStarted,
          game.gameEnded,
          game.periodEnded,
          game.clock,
          game.rulesetId,
        )
      ) {
        return state
      }

      const fromPeriod = game.clock.period
      const toPeriod = fromPeriod + 1
      const match = applyMatchTransition(toMatchStateInput(game), {
        type: 'period_started',
      })

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          periodEnded: match.periodEnded,
          playInProgress: match.playInProgress,
          seriesKind: match.seriesKind,
          clock: {
            period: toPeriod,
            seconds: rules.quarterLengthSeconds,
            running: nextClockRunning(
              { type: 'period_opened' },
              { seconds: rules.quarterLengthSeconds, running: false },
            ),
          },
          plays: [...g.plays, createQuarterStartPlay(g, toPeriod)],
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'quarter_start',
              payload: {
                fromPeriod,
                toPeriod,
                seconds: rules.quarterLengthSeconds,
              },
            },
            clockBefore,
          ),
        ),
      }
    })
  },

  endPeriod: (fixtureId) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game) return state
      if (
        !canEndCurrentPeriod(
          game.gameStarted,
          game.gameEnded,
          game.periodEnded,
          game.clock,
          game.rulesetId,
        )
      ) {
        return state
      }

      const match = applyMatchTransition(toMatchStateInput(game), {
        type: 'period_ended',
      })
      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          periodEnded: match.periodEnded,
          playInProgress: match.playInProgress,
          seriesKind: match.seriesKind,
          clock: {
            ...g.clock,
            seconds: 0,
            running: nextClockRunning(
              { type: 'period_ended' },
              { ...g.clock, seconds: 0 },
            ),
          },
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'period_end',
              payload: { period: game.clock.period },
            },
            clockBefore,
          ),
        ),
      }
    })
  },

  startOvertime: (fixtureId) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (
        !game ||
        !canStartOvertime(
          game.gameStarted,
          game.gameEnded,
          game.periodEnded,
          game.clock,
          game.rulesetId,
        )
      ) {
        return state
      }

      const rules = getFootballRuleset(game.rulesetId)
      const toPeriod = rules.regulationPeriods + 1
      const match = applyMatchTransition(toMatchStateInput(game), {
        type: 'overtime_started',
      })
      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          periodEnded: match.periodEnded,
          playInProgress: match.playInProgress,
          seriesKind: match.seriesKind,
          clock: {
            period: toPeriod,
            seconds: rules.quarterLengthSeconds,
            running: nextClockRunning(
              { type: 'overtime_opened' },
              { seconds: rules.quarterLengthSeconds, running: false },
            ),
          },
          plays: [...g.plays, createQuarterStartPlay(g, toPeriod)],
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'overtime_start',
              payload: { seconds: rules.quarterLengthSeconds },
            },
            clockBefore,
          ),
        ),
      }
    })
  },

  endGame: (fixtureId) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || !game.gameStarted || game.gameEnded) return state

      const atRegulationDecision =
        isAwaitingRegulationDecision(
          game.gameStarted,
          game.gameEnded,
          game.clock,
          game.rulesetId,
        ) && game.periodEnded
      const inOvertime = isOvertimePeriod(game.clock.period, game.rulesetId)

      if (!atRegulationDecision && !inOvertime) return state

      const match = applyMatchTransition(toMatchStateInput(game), {
        type: 'game_ended',
      })
      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          gameEnded: match.gameEnded,
          periodEnded: match.periodEnded,
          playInProgress: match.playInProgress,
          seriesKind: match.seriesKind,
          clock: {
            ...g.clock,
            seconds: 0,
            running: nextClockRunning(
              { type: 'game_ended' },
              { ...g.clock, seconds: 0 },
            ),
          },
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            { type: 'game_end', payload: {} },
            clockBefore,
          ),
        ),
      }
    })
  },

  startNextQuarter: (fixtureId) => {
    get().startPeriod(fixtureId)
  },

  setPossession: (fixtureId, possessionIsHome) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || game.possessionIsHome === possessionIsHome) return state

      const teamAbbr = possessionIsHome
        ? game.fixture.homeAbbr
        : game.fixture.awayAbbr
      const nextBallOn = ballOnForPossession({
        currentPossessionIsHome: game.possessionIsHome,
        nextPossessionIsHome: possessionIsHome,
        ballOn: game.ballOn,
        rules: game.rulesetId,
      })

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          ballOn: nextBallOn,
          possessionIsHome,
          simulation: g.simulation
            ? { ...g.simulation, offenseIsHome: possessionIsHome }
            : g.simulation,
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'possession_toggle',
              payload: { possessionIsHome, teamAbbr },
            },
            { seconds: game.clock.seconds, period: game.clock.period },
          ),
        ),
      }
    })
  },

  setHomeAttacksRight: (fixtureId, homeAttacksRight) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || game.homeAttacksRight === homeAttacksRight) return state

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          homeAttacksRight,
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'field_direction_set',
              payload: {
                homeAttacksRight,
                homeAbbr: game.fixture.homeAbbr,
              },
            },
            { seconds: game.clock.seconds, period: game.clock.period },
          ),
        ),
      }
    })
  },

  tickClock: (fixtureId) => {
    set((state) => ({
      games: updateGame(state.games, fixtureId, (game) => {
        if (!game.clock.running || game.clock.seconds <= 0) {
          return game
        }

        const withSimulation = game.simulation
          ? game
          : { ...game, simulation: createInitialSimulation(true) }

        const withPossession = {
          ...withSimulation,
          possessionIsHome:
            withSimulation.possessionIsHome ??
            withSimulation.simulation?.offenseIsHome ??
            true,
        }

        const nextSeconds = withPossession.clock.seconds - 1
        const clock = {
          ...withPossession.clock,
          seconds: nextSeconds,
          running: nextSeconds > 0,
        }

        const withClock = { ...withPossession, clock }
        const simulationUpdate = tickPlaySimulation(withClock)

        if (!simulationUpdate) {
          return withClock
        }

        return { ...withClock, ...simulationUpdate }
      }),
    }))
  },
}))
