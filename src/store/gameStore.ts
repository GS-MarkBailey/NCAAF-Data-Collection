import { create } from 'zustand'
import type { Fixture, GameState, RiskType } from '@/types'
import type { ActionLogsByFixture, UserAction } from '@/types/actions'
import { FIXTURES, createGameStateForFixture } from '@/data/fixtures'
import { appendAction, createUserAction } from '@/lib/actionLog'
import {
  tickPlaySimulation,
  createInitialSimulation,
  createQuarterStartPlay,
  formatBallOn,
} from '@/lib/playSimulation'
import { formatClock } from '@/lib/format'
import { applyYardDelta } from '@/lib/ballOn'
import { clampDistance, clampDown, MAX_DOWN } from '@/lib/downDistance'
import {
  QUARTER_LENGTH_SECONDS,
  REGULATION_QUARTERS,
  clampPeriod,
  canEndCurrentPeriod,
  canStartNextPeriod,
  canStartOvertime,
  isAwaitingRegulationDecision,
  isOvertimePeriod,
} from '@/lib/clock'

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

      const toDown = clampDown(down)
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

      const toDistance = clampDistance(distance)
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

      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          playInProgress: true,
          playYardsGained: 0,
          playStartDown: g.down,
          playStartDistance: g.distance,
          playStartBallOn: g.ballOn,
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

      const { ballOn, distance } = applyYardDelta({
        ballOn: game.ballOn,
        distance: game.distance,
        delta,
      })
      const actualDelta = ballOn - game.ballOn
      if (actualDelta === 0) return state

      const yardsGained = game.playYardsGained + actualDelta
      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          ballOn,
          distance,
          playYardsGained: yardsGained,
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'yards_adjust',
              payload: {
                delta: actualDelta,
                yardsGained,
                ballOn,
                distance,
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

      const yardsGained = game.playYardsGained
      const startDistance = game.playStartDistance
      const firstDown = yardsGained >= startDistance

      let nextDown = game.down
      let nextDistance = game.distance

      if (firstDown) {
        nextDown = 1
        nextDistance = 10
      } else if (game.down >= MAX_DOWN) {
        // Turnover on downs — flip possession and reset to 1st & 10
        // Keep ballOn as absolute field position for the new offense
        const absoluteYards = game.possessionIsHome
          ? game.ballOn
          : 100 - game.ballOn
        const nextPossessionIsHome = !game.possessionIsHome
        const nextBallOn = nextPossessionIsHome
          ? absoluteYards
          : 100 - absoluteYards
        nextDown = 1
        nextDistance = 10

        const description =
          yardsGained === 0
            ? 'Play ended — turnover on downs'
            : `Play ended — ${yardsGained > 0 ? '+' : ''}${yardsGained} yards, turnover on downs`

        const clockBefore = {
          seconds: game.clock.seconds,
          period: game.clock.period,
        }

        const play = {
          id: crypto.randomUUID(),
          quarter: game.clock.period,
          down: game.playStartDown,
          distance: game.playStartDistance,
          ballOn: formatBallOn(
            game.possessionIsHome,
            game.ballOn,
            game.fixture.homeAbbr,
            game.fixture.awayAbbr,
          ),
          description,
          clock: formatClock(game.clock.seconds),
        }

        return {
          games: updateGame(state.games, fixtureId, (g) => ({
            ...g,
            playInProgress: false,
            playYardsGained: 0,
            down: nextDown,
            distance: nextDistance,
            ballOn: nextBallOn,
            possessionIsHome: nextPossessionIsHome,
            simulation: g.simulation
              ? { ...g.simulation, offenseIsHome: nextPossessionIsHome }
              : g.simulation,
            plays: [...g.plays, play],
          })),
          actionLogs: appendAction(
            state.actionLogs,
            createUserAction(
              fixtureId,
              {
                type: 'play_end',
                payload: {
                  yardsGained,
                  down: nextDown,
                  distance: nextDistance,
                  ballOn: nextBallOn,
                  description,
                },
              },
              clockBefore,
            ),
          ),
        }
      } else {
        nextDown = clampDown(game.down + 1)
        nextDistance = clampDistance(startDistance - yardsGained)
      }

      const description =
        yardsGained === 0
          ? firstDown
            ? 'Play ended — no gain, first down'
            : 'Play ended — no gain'
          : `Play ended — ${yardsGained > 0 ? '+' : ''}${yardsGained} yards${
              firstDown ? ', first down' : ''
            }`

      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      const play = {
        id: crypto.randomUUID(),
        quarter: game.clock.period,
        down: game.playStartDown,
        distance: game.playStartDistance,
        ballOn: formatBallOn(
          game.possessionIsHome,
          game.ballOn,
          game.fixture.homeAbbr,
          game.fixture.awayAbbr,
        ),
        description,
        clock: formatClock(game.clock.seconds),
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          playInProgress: false,
          playYardsGained: 0,
          down: nextDown,
          distance: nextDistance,
          plays: [...g.plays, play],
        })),
        actionLogs: appendAction(
          state.actionLogs,
          createUserAction(
            fixtureId,
            {
              type: 'play_end',
              payload: {
                yardsGained,
                down: nextDown,
                distance: nextDistance,
                ballOn: game.ballOn,
                description,
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

      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      if (!game.gameStarted) {
        return {
          games: updateGame(state.games, fixtureId, (g) => ({
            ...g,
            gameStarted: true,
            periodEnded: false,
            clock: {
              period: 1,
              seconds: QUARTER_LENGTH_SECONDS,
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
                  seconds: QUARTER_LENGTH_SECONDS,
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
        )
      ) {
        return state
      }

      const fromPeriod = game.clock.period
      const toPeriod = fromPeriod + 1

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          periodEnded: false,
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
        )
      ) {
        return state
      }

      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          periodEnded: true,
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
        )
      ) {
        return state
      }

      const toPeriod = REGULATION_QUARTERS + 1
      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          periodEnded: false,
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
              type: 'overtime_start',
              payload: { seconds: QUARTER_LENGTH_SECONDS },
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
        ) && game.periodEnded
      const inOvertime = isOvertimePeriod(game.clock.period)

      if (!atRegulationDecision && !inOvertime) return state

      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          gameEnded: true,
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
