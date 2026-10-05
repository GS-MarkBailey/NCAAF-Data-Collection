import { create } from 'zustand'
import type { Fixture, GameState, RiskType } from '@/types'
import type { ActionLogsByFixture, UserAction } from '@/types/actions'
import { FIXTURES, createGameStateForFixture } from '@/data/fixtures'
import { appendAction, createUserAction } from '@/lib/actionLog'
import {
  adjustLivePlayYards,
  ballOnForPossession,
  canEndCurrentPeriod,
  canStartNextPeriod,
  canStartOvertime,
  clampDistance,
  clampDown,
  clampPeriod,
  createInitialSimulation,
  createQuarterStartPlay,
  applyMatchTransition,
  getFootballRuleset,
  isAwaitingRegulationDecision,
  isOvertimePeriod,
  resolveEndedPlayFromGame,
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
  endPlay: (fixtureId: string) => void
  adjustYards: (fixtureId: string, delta: number) => void
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
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || game.gameEnded) return state
      if (game.clock.seconds <= 0) return state

      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      const running = !game.clock.running
      const seconds = game.clock.seconds
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
      if (!game || game.gameEnded || game.playInProgress) return state

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
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          ...snap,
          seriesKind: match.seriesKind,
          playInProgress: match.playInProgress,
        })),
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

  adjustYards: (fixtureId, delta) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || game.gameEnded || !game.playInProgress || delta === 0) {
        return state
      }

      const adjusted = adjustLivePlayYards({
        ballOn: game.ballOn,
        distance: game.distance,
        playYardsGained: game.playYardsGained,
        delta,
        rules: game.rulesetId,
      })
      if (adjusted.actualDelta === 0) return state

      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          ballOn: adjusted.ballOn,
          distance: adjusted.distance,
          playYardsGained: adjusted.playYardsGained,
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'yards_adjust',
              payload: {
                delta: adjusted.actualDelta,
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

  endPlay: (fixtureId) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || game.gameEnded || !game.playInProgress) return state

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
        rules: game.rulesetId,
      })

      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      const match = applyMatchTransition(toMatchStateInput(game), {
        type: 'end_play',
      })

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          playInProgress: match.playInProgress,
          playYardsGained: resolved.playYardsGained,
          seriesKind: match.seriesKind,
          down: resolved.down,
          distance: resolved.distance,
          ballOn: resolved.ballOn,
          possessionIsHome: resolved.possessionIsHome,
          simulation: g.simulation
            ? { ...g.simulation, offenseIsHome: resolved.possessionIsHome }
            : g.simulation,
          plays: [...g.plays, resolved.play],
        })),
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
        return {
          games: updateGame(state.games, fixtureId, (g) => ({
            ...g,
            gameStarted: match.gameStarted,
            periodEnded: match.periodEnded,
            playInProgress: match.playInProgress,
            seriesKind: match.seriesKind,
            clock: {
              period: 1,
              seconds: rules.quarterLengthSeconds,
              running: true,
            },
            plays: [...g.plays, createQuarterStartPlay(g, 1)],
          })),
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
            running: true,
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
            running: false,
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
            running: true,
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
            running: false,
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
