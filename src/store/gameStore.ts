import { create } from 'zustand'
import type { CollectedDatapoint, Fixture, GameState, RiskType } from '@/types'
import type { ActionLogsByFixture, UserAction } from '@/types/actions'
import { FIXTURES, createGameStateForFixture } from '@/data/fixtures'
import {
  appendAction,
  createUserAction,
  riskToggleLabel,
} from '@/lib/actionLog'
import { formatClock } from '@/lib/format'
import {
  adjustBetweenPlayYards,
  adjustLivePlayYards,
  ballOnForPossession,
  canEndCurrentPeriod,
  canStartNextPeriod,
  canStartOvertime,
  clampClockSeconds,
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
  againstHomeFromChoice,
  canUndoPlayAction,
  enforceAcceptedFlag,
  FLAG_PATH_KEY,
  flagMatchContextFromGame,
  getFlagType,
  getFootballRuleset,
  inferredAgainst,
  isFlagCollectionStep,
  isAwaitingRegulationDecision,
  isOvertimePeriod,
  labelForDatapointWithTeam,
  labelForYardsDeltaWithTeam,
  nextClockRunning,
  parseFlagCollectionPath,
  pushPlayUndoSnapshot,
  resolveEndedPlayFromGame,
  resolveFlagCollectionChoice,
  resolvePlayCollectionChoice,
  startLivePlay,
  teamAbbrForDatapoint,
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
  /** Open flag type / accept-decline collection (association rules apply). */
  openFlagCollection: (fixtureId: string) => void
  /** Restore the previous play-controls action (collection / yards / snap / end). */
  undoPlayControl: (fixtureId: string) => void
  startPeriod: (fixtureId: string) => void
  /** Open kickoff outcome collection (after KICK OFF — opening or ensuing). */
  openKickoffCollection: (fixtureId: string) => void
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

const BALL_ON_EXPORT_KEYS = new Set(['kickoff', 'yards'])

function situationOnDatapoint(
  game: GameState,
  key: string,
  ballOnOverride?: number | null,
): Pick<CollectedDatapoint, 'period' | 'ballOn' | 'drive' | 'play' | 'down' | 'toGo'> {
  const drive = game.driveNumber ?? 0
  const play = game.playNumber ?? 0
  const inDrive = drive > 0 && play > 0
  const includeBallOn =
    ballOnOverride !== undefined || BALL_ON_EXPORT_KEYS.has(key)
  return {
    period: game.clock.period,
    ballOn: includeBallOn
      ? (ballOnOverride !== undefined ? ballOnOverride : game.ballOn)
      : null,
    drive: inDrive ? drive : null,
    play: inDrive ? play : null,
    down: inDrive ? game.down : null,
    toGo: inDrive ? game.distance : null,
  }
}

function makeCollectedDatapoint(
  game: GameState,
  key: string,
  options: {
    path?: readonly string[]
    foulingIsHome?: boolean
    label?: string
    teamAbbr?: string
    ballOn?: number | null
  } = {},
): CollectedDatapoint {
  const path = options.path ?? game.playCollectionPath
  const possessionForLabel =
    options.foulingIsHome === undefined
      ? game.possessionIsHome
      : options.foulingIsHome
  const teamAbbr =
    options.teamAbbr ??
    teamAbbrForDatapoint(
      key,
      possessionForLabel,
      game.fixture.homeAbbr,
      game.fixture.awayAbbr,
      path,
    )
  return {
    id: crypto.randomUUID(),
    key,
    teamAbbr,
    label: options.label ?? labelForDatapointWithTeam(key, teamAbbr),
    clock: formatClock(game.clock.seconds),
    collectedAt: Date.now(),
    ...situationOnDatapoint(game, key, options.ballOn),
  }
}

function appendCollectedDatapoint(
  game: GameState,
  key: string,
  path: readonly string[] = game.playCollectionPath,
  foulingIsHome?: boolean,
): CollectedDatapoint[] {
  return [
    ...(game.collectedDatapoints ?? []),
    makeCollectedDatapoint(game, key, { path, foulingIsHome }),
  ]
}

function makeTeamDatapoint(
  game: GameState,
  key: string,
  path: readonly string[] = game.playCollectionPath,
): CollectedDatapoint {
  return makeCollectedDatapoint(game, key, { path })
}

function advanceDriveForSnap(game: GameState): Pick<
  GameState,
  'driveNumber' | 'playNumber' | 'awaitingNewDrive'
> {
  const driveNumber = game.driveNumber ?? 0
  const playNumber = game.playNumber ?? 0
  const awaitingNewDrive = game.awaitingNewDrive ?? true

  if (awaitingNewDrive || driveNumber === 0) {
    return {
      driveNumber: driveNumber === 0 ? 1 : driveNumber + 1,
      playNumber: 1,
      awaitingNewDrive: false,
    }
  }
  return {
    driveNumber,
    playNumber: playNumber === 0 ? 1 : playNumber,
    awaitingNewDrive: false,
  }
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
      const riskEntry = makeCollectedDatapoint(
        game,
        active ? `risk.${risk}` : `risk.${risk}.cleared`,
        { label: riskToggleLabel(risk, active) },
      )
      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          risks: { ...g.risks, [risk]: active },
          collectedDatapoints: [...(g.collectedDatapoints ?? []), riskEntry],
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
      if (!game || game.gameEnded || delta === 0) return state
      const seconds = clampClockSeconds(
        game.clock.seconds + delta,
        game.rulesetId,
      )
      if (seconds === game.clock.seconds) return state
      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }
      // Works while running or stopped — only the displayed time changes.
      return {
        games: updateGame(state.games, fixtureId, (g) => ({
          ...g,
          periodEnded: seconds > 0 ? false : g.periodEnded,
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

      const nextSeconds = clampClockSeconds(seconds, game.rulesetId)
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
          const driveState = advanceDriveForSnap(withUndo)
          const snapped = { ...withUndo, ...driveState }
          return {
            ...snapped,
            ...snap,
            seriesKind: match.seriesKind,
            playInProgress: match.playInProgress,
            playCollectionStep: INITIAL_PLAY_COLLECTION_STEP,
            playCollectionPath: [],
            collectedDatapoints: appendCollectedDatapoint(snapped, 'snap'),
            clock: {
              ...snapped.clock,
              running: nextClockRunning({ type: 'snap' }, snapped.clock),
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
      if (!game || game.gameEnded) return state
      const stepId = game.playCollectionStep
      if (!stepId) return state

      if (isFlagCollectionStep(stepId)) {
        const flagResolved = resolveFlagCollectionChoice(
          stepId,
          optionId,
          game.playCollectionPath,
          flagMatchContextFromGame(game),
        )
        if (!flagResolved) return state

        return {
          games: updateGame(state.games, fixtureId, (g) => {
            const withUndo = pushPlayUndoSnapshot(g)
            const path = [...withUndo.playCollectionPath, optionId]
            const parsed = parseFlagCollectionPath(path)
            const against =
              parsed.against ?? inferredAgainst(parsed.typeId)
            const againstHome =
              against != null
                ? againstHomeFromChoice(against, withUndo.possessionIsHome)
                : undefined

            if (flagResolved.decision === 'declined') {
              const resume = withUndo.flagResume
              const type = parsed.typeId ? getFlagType(parsed.typeId) : undefined
              const flagEvent = {
                id: crypto.randomUUID(),
                typeId: parsed.typeId ?? ('flag.personal_foul' as const),
                againstHome: againstHome ?? withUndo.possessionIsHome,
                decision: 'declined' as const,
                rulesetId: withUndo.rulesetId,
                period: withUndo.clock.period,
                clockSeconds: withUndo.clock.seconds,
                collectedAt: Date.now(),
              }
              return {
                ...withUndo,
                playInProgress: resume?.playInProgress ?? false,
                playCollectionStep: resume?.playCollectionStep ?? null,
                playCollectionPath: resume?.playCollectionPath ?? [],
                flagResume: null,
                flagEvents: [...(withUndo.flagEvents ?? []), flagEvent],
                collectedDatapoints: appendCollectedDatapoint(
                  withUndo,
                  optionId,
                  path,
                  againstHome,
                ),
                plays: type
                  ? [
                      ...withUndo.plays,
                      {
                        id: crypto.randomUUID(),
                        quarter: withUndo.clock.period,
                        down: withUndo.down,
                        distance: withUndo.distance,
                        ballOn: String(withUndo.ballOn),
                        description: `${type.label} — declined`,
                        clock: formatClock(withUndo.clock.seconds),
                      },
                    ]
                  : withUndo.plays,
              }
            }

            if (flagResolved.decision === 'accepted') {
              if (!parsed.typeId || against == null || againstHome == null) {
                return withUndo
              }
              const enforced = enforceAcceptedFlag({
                typeId: parsed.typeId,
                against,
                againstHome,
                ballOn: withUndo.ballOn,
                down: withUndo.down,
                distance: withUndo.distance,
                possessionIsHome: withUndo.possessionIsHome,
                playStartBallOn: withUndo.playStartBallOn,
                playStartDistance: withUndo.playStartDistance,
                seriesKind: withUndo.seriesKind,
                rulesetId: withUndo.rulesetId,
                playInProgress: withUndo.flagResume?.playInProgress ?? withUndo.playInProgress,
              })
              if (!enforced) return withUndo
              const rules = getFootballRuleset(withUndo.rulesetId)
              const flagEvent = {
                id: crypto.randomUUID(),
                typeId: parsed.typeId,
                againstHome,
                decision: 'accepted' as const,
                rulesetId: withUndo.rulesetId,
                period: withUndo.clock.period,
                clockSeconds: withUndo.clock.seconds,
                collectedAt: Date.now(),
              }
              const score = { ...withUndo.score }
              if (enforced.scoredSafety) {
                if (enforced.safetyDefenseIsHome) {
                  score.home += rules.safetyPoints
                } else {
                  score.away += rules.safetyPoints
                }
              }
              return {
                ...withUndo,
                playInProgress: false,
                seriesKind: enforced.nextSeries,
                playCollectionStep: null,
                playCollectionPath: [],
                flagResume: null,
                ballOn: enforced.ballOn,
                down: enforced.down,
                distance: enforced.distance,
                possessionIsHome: enforced.possessionIsHome,
                playYardsGained: 0,
                playStartDown: enforced.down,
                playStartDistance: enforced.distance,
                playStartBallOn: enforced.ballOn,
                score,
                flagEvents: [...(withUndo.flagEvents ?? []), flagEvent],
                collectedDatapoints: appendCollectedDatapoint(
                  withUndo,
                  optionId,
                  path,
                  againstHome,
                ),
                clock: {
                  ...withUndo.clock,
                  running: nextClockRunning(
                    { type: 'flag_accepted' },
                    withUndo.clock,
                  ),
                },
                simulation: withUndo.simulation
                  ? {
                      ...withUndo.simulation,
                      offenseIsHome: enforced.possessionIsHome,
                    }
                  : withUndo.simulation,
                plays: [
                  ...withUndo.plays,
                  {
                    id: crypto.randomUUID(),
                    quarter: withUndo.clock.period,
                    down: withUndo.playStartDown,
                    distance: withUndo.playStartDistance,
                    ballOn: String(withUndo.playStartBallOn),
                    description: enforced.summary,
                    clock: formatClock(withUndo.clock.seconds),
                  },
                ],
              }
            }

            return {
              ...withUndo,
              playCollectionStep: flagResolved.nextStep,
              playCollectionPath: path,
              collectedDatapoints: appendCollectedDatapoint(
                withUndo,
                optionId,
                path,
                againstHome,
              ),
            }
          }),
        }
      }

      if (!game.playInProgress) return state

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
            collectedDatapoints: appendCollectedDatapoint(
              withUndo,
              optionId,
              path,
            ),
          }
        }),
      }
    })
    if (shouldAutoEnd) {
      get().endPlay(fixtureId, { skipUndoPush: true })
    }
  },

  openFlagCollection: (fixtureId) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || game.gameEnded || isFlagCollectionStep(game.playCollectionStep)) {
        return state
      }
      if (!game.gameStarted) return state

      return {
        games: updateGame(state.games, fixtureId, (g) => {
          const withUndo = pushPlayUndoSnapshot(g)
          return {
            ...withUndo,
            flagResume: {
              playInProgress: withUndo.playInProgress,
              playCollectionStep: withUndo.playCollectionStep,
              playCollectionPath: [...withUndo.playCollectionPath],
            },
            playCollectionStep: 'choose_flag_category',
            playCollectionPath: [...withUndo.playCollectionPath, FLAG_PATH_KEY],
            collectedDatapoints: appendCollectedDatapoint(
              withUndo,
              FLAG_PATH_KEY,
              [...withUndo.playCollectionPath, FLAG_PATH_KEY],
            ),
          }
        }),
      }
    })
  },

  adjustYards: (fixtureId, delta) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (!game || game.gameEnded || delta === 0) {
        return state
      }

      // Live play: move ball + accumulate play yards.
      // Between plays on scrimmage: spot the ball; if the nudge covers
      // remaining to-go, award 1st & 10 (play ended short, operator corrects).
      let nextBallOn: number
      let nextDistance: number
      let nextDown: number
      let nextPlayYards: number
      let actualDelta: number

      if (game.playInProgress) {
        const live = adjustLivePlayYards({
          ballOn: game.ballOn,
          distance: game.distance,
          playYardsGained: game.playYardsGained,
          delta,
          rules: game.rulesetId,
        })
        nextBallOn = live.ballOn
        nextDistance = live.distance
        nextDown = game.down
        nextPlayYards = live.playYardsGained
        actualDelta = live.actualDelta
      } else if (game.seriesKind === 'scrimmage') {
        const between = adjustBetweenPlayYards({
          ballOn: game.ballOn,
          distance: game.distance,
          down: game.down,
          delta,
          rules: game.rulesetId,
        })
        nextBallOn = between.ballOn
        nextDistance = between.distance
        nextDown = between.down
        nextPlayYards = game.playYardsGained
        actualDelta = between.actualDelta
      } else {
        // Kickoff / try spotting — move ball + to-go only.
        const rules = getFootballRuleset(game.rulesetId)
        nextBallOn = Math.max(
          rules.minBallOn,
          Math.min(rules.maxBallOn, Math.round(game.ballOn + delta)),
        )
        actualDelta = nextBallOn - game.ballOn
        nextDistance = Math.max(rules.minDistance, game.distance - actualDelta)
        nextDown = game.down
        nextPlayYards = game.playYardsGained
      }

      if (actualDelta === 0) return state

      const clockBefore = {
        seconds: game.clock.seconds,
        period: game.clock.period,
      }

      return {
        games: updateGame(state.games, fixtureId, (g) => {
          const withUndo = pushPlayUndoSnapshot(g)
          const teamAbbr = teamAbbrForDatapoint(
            'yards',
            withUndo.possessionIsHome,
            withUndo.fixture.homeAbbr,
            withUndo.fixture.awayAbbr,
            withUndo.playCollectionPath,
          )
          const afterYards = {
            ...withUndo,
            ballOn: nextBallOn,
            distance: nextDistance,
            down: nextDown,
            playYardsGained: nextPlayYards,
          }
          const yardPoint = makeCollectedDatapoint(afterYards, 'yards', {
            teamAbbr,
            label: labelForYardsDeltaWithTeam(actualDelta, teamAbbr),
            ballOn: nextBallOn,
          })
          return {
            ...afterYards,
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
                yardsGained: nextPlayYards,
                ballOn: nextBallOn,
                distance: nextDistance,
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
          const possessionChanged =
            resolved.possessionIsHome !== withUndo.possessionIsHome
          const opensNewDrive =
            withUndo.seriesKind === 'free_kick' ||
            endingTry ||
            resolved.scoredTouchdown ||
            possessionChanged ||
            resolved.nextSeries === 'free_kick' ||
            resolved.nextSeries === 'try'
          const continuingScrimmage =
            !opensNewDrive && withUndo.seriesKind === 'scrimmage'

          const afterDrive = {
            ...withUndo,
            awaitingNewDrive: opensNewDrive
              ? true
              : (withUndo.awaitingNewDrive ?? false),
            playNumber: continuingScrimmage
              ? (withUndo.playNumber ?? 0) + 1
              : (withUndo.playNumber ?? 0),
            // Spot down/distance for the upcoming play on "next play" rows.
            down: resolved.down,
            distance: resolved.distance,
            ballOn: resolved.ballOn,
            possessionIsHome: resolved.possessionIsHome,
          }
          const withEnd = appendCollectedDatapoint(afterDrive, 'end_play')
          const base = {
            ...afterDrive,
            playYardsGained: resolved.playYardsGained,
            seriesKind: match.seriesKind,
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
            const forTry = {
              ...base,
              playInProgress: true,
              seriesKind: 'try' as const,
              ballOn: TRY_SPOT_BALL_ON,
              playStartBallOn: TRY_SPOT_BALL_ON,
              playStartDown: resolved.down,
              playStartDistance: resolved.distance,
              playCollectionStep: INITIAL_TRY_COLLECTION_STEP,
              playCollectionPath: ['try'],
              awaitingNewDrive: true,
            }
            return {
              ...forTry,
              collectedDatapoints: [
                ...withEnd,
                makeTeamDatapoint(forTry, 'try'),
              ],
            }
          }

          // Try resolved → wait for operator KICK OFF (do not open outcomes yet).
          if (endingTry) {
            return {
              ...base,
              playInProgress: false,
              seriesKind: 'free_kick',
              playCollectionStep: null,
              playCollectionPath: [],
              playStartBallOn: resolved.ballOn,
              playStartDown: resolved.down,
              playStartDistance: resolved.distance,
              awaitingNewDrive: true,
              collectedDatapoints: withEnd,
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

  openKickoffCollection: (fixtureId) => {
    set((state) => {
      const game = state.games[fixtureId]
      if (
        !game ||
        game.gameEnded ||
        game.playInProgress ||
        game.seriesKind !== 'free_kick'
      ) {
        return state
      }

      const rules = getFootballRuleset(game.rulesetId)
      const spot = game.ballOn || rules.defaultBallOn

      return {
        games: updateGame(state.games, fixtureId, (g) => {
          const withUndo = pushPlayUndoSnapshot(g)
          // After a try, possession is still the scoring (kicking) team.
          // KICK OFF flips possession to the receivers for the kick play.
          const receivingIsHome = !withUndo.possessionIsHome
          const kickoffGame = {
            ...withUndo,
            possessionIsHome: receivingIsHome,
            ballOn: spot,
            awaitingNewDrive: true,
          }
          return {
            ...withUndo,
            playInProgress: true,
            seriesKind: 'free_kick',
            possessionIsHome: receivingIsHome,
            playCollectionStep: INITIAL_KICKOFF_COLLECTION_STEP,
            playCollectionPath: ['kickoff'],
            playYardsGained: 0,
            playStartDown: rules.minDown,
            playStartDistance: rules.firstDownDistance,
            playStartBallOn: spot,
            ballOn: spot,
            down: rules.minDown,
            distance: rules.firstDownDistance,
            awaitingNewDrive: true,
            simulation: withUndo.simulation
              ? {
                  ...withUndo.simulation,
                  offenseIsHome: receivingIsHome,
                }
              : withUndo.simulation,
            collectedDatapoints: [
              ...(withUndo.collectedDatapoints ?? []),
              makeCollectedDatapoint(kickoffGame, 'kickoff', {
                path: ['kickoff'],
                ballOn: spot,
              }),
            ],
            clock: {
              ...withUndo.clock,
              running: nextClockRunning(
                { type: 'kickoff_opened' },
                withUndo.clock,
              ),
            },
          }
        }),
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
            // Opening KO: home kicks, away receives (NCAA-style).
            // Possession = receiving team for the kick + first snap.
            const receivingIsHome = false
            const kickoffGame = {
              ...withUndo,
              possessionIsHome: receivingIsHome,
              ballOn: spot,
              awaitingNewDrive: true,
              clock: {
                period: 1,
                seconds: rules.quarterLengthSeconds,
                running: false,
              },
            }
            return {
              ...withUndo,
              gameStarted: match.gameStarted,
              periodEnded: match.periodEnded,
              playInProgress: match.playInProgress,
              seriesKind: match.seriesKind,
              possessionIsHome: receivingIsHome,
              playCollectionStep: INITIAL_KICKOFF_COLLECTION_STEP,
              playCollectionPath: ['kickoff'],
              awaitingNewDrive: true,
              driveNumber: 0,
              playNumber: 0,
              collectedDatapoints: [
                ...(withUndo.collectedDatapoints ?? []),
                makeCollectedDatapoint(kickoffGame, 'kickoff', {
                  path: ['kickoff'],
                  ballOn: spot,
                }),
              ],
              playYardsGained: 0,
              playStartDown: rules.minDown,
              playStartDistance: rules.firstDownDistance,
              playStartBallOn: spot,
              ballOn: spot,
              down: rules.minDown,
              distance: rules.firstDownDistance,
              simulation: withUndo.simulation
                ? {
                    ...withUndo.simulation,
                    offenseIsHome: receivingIsHome,
                  }
                : withUndo.simulation,
              clock: {
                period: 1,
                seconds: rules.quarterLengthSeconds,
                running: nextClockRunning(
                  { type: 'kickoff_opened' },
                  { seconds: rules.quarterLengthSeconds, running: false },
                ),
              },
              plays: [
                ...withUndo.plays,
                createQuarterStartPlay(
                  { ...withUndo, possessionIsHome: receivingIsHome },
                  1,
                ),
              ],
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
