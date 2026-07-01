import { create } from 'zustand'
import type { Fixture, GameState, RiskType } from '@/types'
import type { ActionLogsByFixture, UserAction } from '@/types/actions'
import { FIXTURES, createInitialGameState } from '@/data/fixtures'
import { appendAction, createUserAction } from '@/lib/actionLog'
import { tickPlaySimulation, createInitialSimulation, createQuarterStartPlay } from '@/lib/playSimulation'
import {
  QUARTER_LENGTH_SECONDS,
  isAwaitingQuarterStart,
} from '@/lib/clock'

interface AppStore {
  fixtures: Fixture[]
  games: Record<string, GameState>
  actionLogs: ActionLogsByFixture

  initGame: (fixtureId: string) => void
  getGame: (fixtureId: string) => GameState | undefined
  getActionLog: (fixtureId: string) => UserAction[]

  toggleTakeControl: (fixtureId: string) => void
  toggleRisk: (fixtureId: string, risk: RiskType) => void
  toggleClock: (fixtureId: string) => void
  adjustClock: (fixtureId: string, delta: number) => void
  setClockTime: (fixtureId: string, seconds: number) => void
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
        [fixtureId]: state.games[fixtureId] ?? createInitialGameState(fixture),
      },
    }))
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
      if (!game) return state
      if (isAwaitingQuarterStart(game.clock)) return state

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
            { seconds: game.clock.seconds, period: game.clock.period },
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

  startNextQuarter: (fixtureId) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || !isAwaitingQuarterStart(game.clock)) return state

      const fromPeriod = game.clock.period
      const toPeriod = fromPeriod + 1
      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          clock: {
            period: toPeriod,
            seconds: QUARTER_LENGTH_SECONDS,
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
                seconds: QUARTER_LENGTH_SECONDS,
              },
            },
            clockBefore,
          ),
        ),
      }
    })
  },

  setPossession: (fixtureId, possessionIsHome) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || game.possessionIsHome === possessionIsHome) return state

      const teamAbbr = possessionIsHome
        ? game.fixture.homeAbbr
        : game.fixture.awayAbbr

      const absoluteYards = game.possessionIsHome
        ? game.ballOn
        : 100 - game.ballOn
      const nextBallOn = possessionIsHome ? absoluteYards : 100 - absoluteYards

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

      const isInitialSet = game.homeAttacksRight === null

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          homeAttacksRight,
          clock: isInitialSet
            ? { ...g.clock, running: true }
            : g.clock,
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
        if (!game.clock.running || game.clock.seconds <= 0) return game

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
