/**
 * American football match-state machine (shared across NCAA / NFL / CFL).
 *
 * League differences (3 vs 4 downs, field length, rouge, etc.) live in
 * `rulesets` + `catalog`. This module defines *when* data can be collected
 * and which actions are legal — the same phase graph for all codes.
 */

import type { FootballCode, GameState, SeriesKind } from '@/types'
import {
  CLOCK_EVENTS,
  PENALTIES,
  PLAY_TYPES,
  SCORING_EVENTS,
  SPECIAL_TEAMS_EVENTS,
  TURNOVERS,
  filterByLeague,
  type CatalogEntryBase,
} from './catalog'
import {
  canStartOvertime,
  isAwaitingRegulationDecision,
} from './clock'
import { getFootballRuleset } from './rulesets'

export type { SeriesKind }

/**
 * High-level match phase for operator collection.
 * Consistent for all American football; ruleset only changes limits/labels.
 */
export type MatchPhase =
  | 'pregame'
  | 'free_kick'
  | 'pre_snap'
  | 'live_play'
  | 'try'
  | 'period_break'
  | 'regulation_decision'
  | 'game_ended'

/** Operator actions the UI may offer in a given phase. */
export type MatchActionId =
  | 'snap'
  | 'end_play'
  | 'adjust_yards'
  | 'set_down'
  | 'set_distance'
  | 'set_ball_on'
  | 'set_possession'
  | 'record_play_result'
  | 'record_penalty'
  | 'record_turnover'
  | 'record_score'
  | 'record_special_teams'
  | 'start_period'
  | 'end_period'
  | 'start_overtime'
  | 'end_game'
  | 'toggle_clock'
  | 'edit_clock'
  | 'kickoff'
  | 'punt'
  | 'field_goal_attempt'
  | 'conversion_attempt'

/** A datapoint the operator can collect in the current phase. */
export interface MatchCollectable {
  id: string
  label: string
  description: string
  /** Catalog ids that populate this datapoint (when applicable). */
  catalogIds?: readonly string[]
  /** Required before leaving the phase (soft guidance for UI). */
  required?: boolean
}

export interface MatchAction {
  id: MatchActionId
  label: string
  description: string
}

export interface MatchStateView {
  phase: MatchPhase
  seriesKind: SeriesKind
  rulesetId: FootballCode
  /** Human label for the phase. */
  label: string
  description: string
  actions: MatchAction[]
  collectables: MatchCollectable[]
  /** Catalog slices filtered to this league for pickers. */
  catalogs: {
    plays: CatalogEntryBase[]
    penalties: CatalogEntryBase[]
    turnovers: CatalogEntryBase[]
    scoring: CatalogEntryBase[]
    specialTeams: CatalogEntryBase[]
    clock: CatalogEntryBase[]
  }
}

/** Minimal fields required to derive match phase (avoids full GameState coupling). */
export interface MatchStateInput {
  rulesetId: FootballCode
  gameStarted: boolean
  gameEnded: boolean
  periodEnded: boolean
  playInProgress: boolean
  seriesKind: SeriesKind
  clock: { seconds: number; period: number; running: boolean }
}

export function toMatchStateInput(
  game: Pick<
    GameState,
    | 'rulesetId'
    | 'gameStarted'
    | 'gameEnded'
    | 'periodEnded'
    | 'playInProgress'
    | 'seriesKind'
    | 'clock'
  >,
): MatchStateInput {
  return {
    rulesetId: game.rulesetId ?? 'ncaa',
    gameStarted: game.gameStarted ?? false,
    gameEnded: game.gameEnded ?? false,
    periodEnded: game.periodEnded ?? false,
    playInProgress: game.playInProgress ?? false,
    seriesKind: game.seriesKind ?? 'scrimmage',
    clock: game.clock ?? { seconds: 0, period: 1, running: false },
  }
}

const PHASE_COPY: Record<
  MatchPhase,
  { label: string; description: string }
> = {
  pregame: {
    label: 'Pregame',
    description: 'Match not started — opening kickoff / Q1 still to come.',
  },
  free_kick: {
    label: 'Free kick',
    description: 'Ball next put in play by kickoff or free kick after safety.',
  },
  pre_snap: {
    label: 'Pre-snap',
    description: 'Between scrimmage plays — set downs/distance, then SNAP.',
  },
  live_play: {
    label: 'Live play',
    description: 'After SNAP — collect yards, result, penalties; then END PLAY.',
  },
  try: {
    label: 'Try / convert',
    description: 'After a touchdown — kick or two-point convert.',
  },
  period_break: {
    label: 'Period break',
    description: 'Current period ended — start the next period when ready.',
  },
  regulation_decision: {
    label: 'Regulation decision',
    description: 'Regulation complete — start overtime or end the game.',
  },
  game_ended: {
    label: 'Game ended',
    description: 'Final — match state is read-only.',
  },
}

function action(
  id: MatchActionId,
  label: string,
  description: string,
): MatchAction {
  return { id, label, description }
}

function collectable(
  partial: MatchCollectable,
): MatchCollectable {
  return partial
}

/** True once kickoff / clock / live play has put the match underway. */
export function isMatchUnderway(input: MatchStateInput): boolean {
  return input.gameStarted || input.playInProgress || input.clock.running
}

/** Derive the current match phase from session flags. */
export function getMatchPhase(input: MatchStateInput): MatchPhase {
  if (input.gameEnded) return 'game_ended'

  // Live play wins even if Q1 hasn't been formally started (MVP clock mode).
  if (input.playInProgress) return 'live_play'

  if (!isMatchUnderway(input)) return 'pregame'

  if (
    isAwaitingRegulationDecision(
      input.gameStarted,
      input.gameEnded,
      input.clock,
      input.rulesetId,
    ) &&
    input.periodEnded
  ) {
    return 'regulation_decision'
  }

  if (input.periodEnded) return 'period_break'

  if (input.seriesKind === 'free_kick') return 'free_kick'
  if (input.seriesKind === 'try') return 'try'

  return 'pre_snap'
}

function actionsForPhase(
  phase: MatchPhase,
  input: MatchStateInput,
): MatchAction[] {
  const rules = getFootballRuleset(input.rulesetId)

  switch (phase) {
    case 'pregame':
      return [
        action('kickoff', 'Kick off', 'Open the match / start period 1'),
        action('edit_clock', 'Edit clock', 'Set opening clock / period'),
        action('set_possession', 'Set possession', 'Who receives / has the ball'),
      ]
    case 'free_kick':
      return [
        action('kickoff', 'Kickoff / free kick', 'Collect the free-kick play'),
        action('record_special_teams', 'Special teams result', 'Return, touchback, OOB, onside, …'),
        action('record_penalty', 'Penalty', 'Foul on the kick'),
        action('record_score', 'Score', 'Return TD, rouge (CFL), safety, …'),
        action('edit_clock', 'Edit clock', 'Adjust game clock'),
        action('toggle_clock', 'Start / pause clock', 'Run or stop the game clock'),
        action('set_possession', 'Set possession', 'Receiving / kicking team'),
      ]
    case 'pre_snap':
      return [
        action('snap', 'Snap', 'Start collecting the live scrimmage play'),
        action('set_down', 'Set down', `Down 1–${rules.maxDown}`),
        action('set_distance', 'Set distance', 'Yards to go'),
        action('set_ball_on', 'Set ball-on', 'Field position'),
        action('set_possession', 'Set possession', 'Offense'),
        action('punt', 'Punt', 'Declare a scrimmage kick (punt)'),
        action('field_goal_attempt', 'Field goal', 'Declare a field-goal attempt'),
        action('record_penalty', 'Pre-snap penalty', 'False start, offside, delay, …'),
        action('edit_clock', 'Edit clock', 'Adjust game clock / period'),
        action('toggle_clock', 'Start / pause clock', 'Run or stop the game clock'),
        action('end_period', 'End period', 'End the current period'),
      ]
    case 'live_play':
      return [
        action('adjust_yards', 'Adjust yards', '± yardage during the live play'),
        action('record_play_result', 'Play result', 'Rush, pass, sack, incomplete, …'),
        action('record_turnover', 'Turnover', 'INT, fumble, …'),
        action('record_penalty', 'Penalty', 'Foul during the play'),
        action('record_score', 'Score', 'TD, safety, …'),
        action('end_play', 'End play', 'Finalize down / distance / possession'),
        action('edit_clock', 'Edit clock', 'Adjust game clock if needed'),
      ]
    case 'try':
      return [
        action('conversion_attempt', 'Convert attempt', 'Kick or two-point try'),
        action('record_score', 'Convert result', '1-pt, 2-pt, miss, defensive convert'),
        action('record_penalty', 'Penalty', 'Foul on the try'),
        action('edit_clock', 'Edit clock', 'Adjust game clock'),
      ]
    case 'period_break': {
      const actions: MatchAction[] = [
        action('edit_clock', 'Edit clock', 'Adjust before next period'),
        action(
          'toggle_clock',
          'Start clock',
          'Start the next period from the game clock',
        ),
      ]
      return actions
    }
    case 'regulation_decision': {
      const actions: MatchAction[] = [
        action('end_game', 'End game', 'Final — regulation complete'),
      ]
      if (
        canStartOvertime(
          input.gameStarted,
          input.gameEnded,
          input.periodEnded,
          input.clock,
          input.rulesetId,
        )
      ) {
        actions.unshift(
          action(
            'start_overtime',
            'Start overtime',
            'Begin extra period(s)',
          ),
        )
      }
      return actions
    }
    case 'game_ended':
      return []
  }
}

function collectablesForPhase(
  phase: MatchPhase,
  rulesetId: FootballCode,
): MatchCollectable[] {
  const plays = filterByLeague([...PLAY_TYPES], rulesetId)
  const penalties = filterByLeague([...PENALTIES], rulesetId)
  const turnovers = filterByLeague([...TURNOVERS], rulesetId)
  const scoring = filterByLeague([...SCORING_EVENTS], rulesetId)
  const specialTeams = filterByLeague([...SPECIAL_TEAMS_EVENTS], rulesetId)

  switch (phase) {
    case 'pregame':
      return [
        collectable({
          id: 'field_direction',
          label: 'Field direction',
          description: 'Which way home attacks in Q1',
        }),
        collectable({
          id: 'opening_possession',
          label: 'Opening possession / receiver',
          description: 'Who receives the opening kickoff',
        }),
        collectable({
          id: 'opening_clock',
          label: 'Opening clock',
          description: 'Period and time at kickoff',
        }),
      ]
    case 'free_kick':
      return [
        collectable({
          id: 'kick_type',
          label: 'Kick type',
          description: 'Kickoff, onside, free kick after safety',
          catalogIds: specialTeams.map((e) => e.id),
          required: true,
        }),
        collectable({
          id: 'kick_result',
          label: 'Kick result',
          description: 'Return, touchback, OOB, recovery, score',
          catalogIds: specialTeams.map((e) => e.id),
          required: true,
        }),
        collectable({
          id: 'return_yards',
          label: 'Return yards',
          description: 'Yards gained on the return (if any)',
        }),
        collectable({
          id: 'penalty',
          label: 'Penalty',
          description: 'Foul on the kick / return',
          catalogIds: penalties.map((e) => e.id),
        }),
        collectable({
          id: 'score',
          label: 'Score',
          description: 'Return TD, rouge, safety, …',
          catalogIds: scoring.map((e) => e.id),
        }),
        collectable({
          id: 'next_spot',
          label: 'Next spot',
          description: 'Ball-on / possession after the kick',
          required: true,
        }),
      ]
    case 'pre_snap':
      return [
        collectable({
          id: 'down',
          label: 'Down',
          description: 'Current down',
          required: true,
        }),
        collectable({
          id: 'distance',
          label: 'Distance',
          description: 'Yards to go',
          required: true,
        }),
        collectable({
          id: 'ball_on',
          label: 'Ball-on',
          description: 'Field position',
          required: true,
        }),
        collectable({
          id: 'possession',
          label: 'Possession',
          description: 'Team on offense',
          required: true,
        }),
        collectable({
          id: 'pre_snap_penalty',
          label: 'Pre-snap penalty',
          description: 'False start, offside, delay, …',
          catalogIds: penalties
            .filter((e) => e.id.includes('false_start') || e.id.includes('offside') || e.id.includes('delay') || e.id.includes('illegal_procedure') || e.id.includes('encroachment') || e.id.includes('neutral_zone') || e.id.includes('time_count'))
            .map((e) => e.id),
        }),
        collectable({
          id: 'declared_kick',
          label: 'Declared kick',
          description: 'Optional: punt or field-goal attempt',
          catalogIds: ['st.punt', 'st.field_goal_attempt'],
        }),
      ]
    case 'live_play':
      return [
        collectable({
          id: 'yards',
          label: 'Yards gained / lost',
          description: 'Net offense yards on the play',
          required: true,
        }),
        collectable({
          id: 'play_result',
          label: 'Play result',
          description: 'Rush, pass complete/incomplete, sack, scramble, …',
          catalogIds: plays.map((e) => e.id),
          required: true,
        }),
        collectable({
          id: 'turnover',
          label: 'Turnover',
          description: 'INT, fumble lost, … (if any)',
          catalogIds: turnovers.map((e) => e.id),
        }),
        collectable({
          id: 'penalty',
          label: 'Penalty',
          description: 'Foul during the play (if any)',
          catalogIds: penalties.map((e) => e.id),
        }),
        collectable({
          id: 'score',
          label: 'Score',
          description: 'Touchdown, safety, … (if any)',
          catalogIds: scoring.map((e) => e.id),
        }),
        collectable({
          id: 'ball_on_after',
          label: 'Ball-on after play',
          description: 'Ending field position before END PLAY resolution',
        }),
      ]
    case 'try':
      return [
        collectable({
          id: 'convert_type',
          label: 'Convert type',
          description: 'Kick or two-point scrimmage try',
          catalogIds: ['score.conversion_kick', 'score.conversion_play'],
          required: true,
        }),
        collectable({
          id: 'convert_result',
          label: 'Convert result',
          description: 'Good, no good, blocked, defensive convert',
          catalogIds: scoring.map((e) => e.id),
          required: true,
        }),
        collectable({
          id: 'penalty',
          label: 'Penalty',
          description: 'Foul on the try',
          catalogIds: penalties.map((e) => e.id),
        }),
      ]
    case 'period_break':
      return [
        collectable({
          id: 'period_summary',
          label: 'Period end confirmed',
          description: 'Clock at 0 / period ended flag',
          required: true,
        }),
      ]
    case 'regulation_decision':
      return [
        collectable({
          id: 'regulation_choice',
          label: 'OT or final',
          description: 'Start overtime or end the game',
          required: true,
        }),
      ]
    case 'game_ended':
      return [
        collectable({
          id: 'final_score',
          label: 'Final score',
          description: 'Read-only final score',
          required: true,
        }),
      ]
  }
}

/** Full operator view: phase + legal actions + collectables + league catalogs. */
export function getMatchStateView(input: MatchStateInput): MatchStateView {
  const phase = getMatchPhase(input)
  const copy = PHASE_COPY[phase]
  const rulesetId = input.rulesetId

  return {
    phase,
    seriesKind: input.seriesKind,
    rulesetId,
    label: copy.label,
    description: copy.description,
    actions: actionsForPhase(phase, input),
    collectables: collectablesForPhase(phase, rulesetId),
    catalogs: {
      plays: filterByLeague([...PLAY_TYPES], rulesetId),
      penalties: filterByLeague([...PENALTIES], rulesetId),
      turnovers: filterByLeague([...TURNOVERS], rulesetId),
      scoring: filterByLeague([...SCORING_EVENTS], rulesetId),
      specialTeams: filterByLeague([...SPECIAL_TEAMS_EVENTS], rulesetId),
      clock: filterByLeague([...CLOCK_EVENTS], rulesetId),
    },
  }
}

export function matchHasAction(
  view: MatchStateView,
  actionId: MatchActionId,
): boolean {
  return view.actions.some((action) => action.id === actionId)
}

/** Convenience: capabilities used by today’s play-controls UI. */
export function getPlayControlCapabilities(input: MatchStateInput): {
  phase: MatchPhase
  canKickOff: boolean
  canSnap: boolean
  canEndPlay: boolean
  canAdjustYards: boolean
} {
  const view = getMatchStateView(input)
  const inLivePlay = input.playInProgress && !input.gameEnded
  const underway = isMatchUnderway(input)
  return {
    phase: view.phase,
    canKickOff: view.phase === 'pregame' && !input.gameEnded,
    // SNAP only after kickoff — pregame shows KICK OFF instead.
    canSnap:
      !inLivePlay &&
      underway &&
      (matchHasAction(view, 'snap') || view.phase === 'pre_snap'),
    canEndPlay: inLivePlay || matchHasAction(view, 'end_play'),
    canAdjustYards: inLivePlay || matchHasAction(view, 'adjust_yards'),
  }
}

// —— Transitions (pure next-flag patches) ——

export type MatchTransitionEvent =
  | { type: 'game_started' }
  | { type: 'snap' }
  | { type: 'end_play'; scoredTouchdown?: boolean; nextSeries?: SeriesKind }
  | { type: 'free_kick_resolved'; nextSeries?: SeriesKind }
  | { type: 'try_resolved' }
  | { type: 'period_ended' }
  | { type: 'period_started'; openingKickoff?: boolean }
  | { type: 'overtime_started' }
  | { type: 'game_ended' }

export interface MatchTransitionResult {
  phase: MatchPhase
  seriesKind: SeriesKind
  playInProgress: boolean
  gameStarted: boolean
  gameEnded: boolean
  periodEnded: boolean
}

/**
 * Apply a match-level event and return the next phase flags.
 * Does not mutate yardage / score — only series / phase bookkeeping.
 */
export function applyMatchTransition(
  input: MatchStateInput,
  event: MatchTransitionEvent,
): MatchTransitionResult {
  switch (event.type) {
    case 'game_started': {
      // Opening kickoff collection — free_kick until the kick is resolved.
      const next: MatchStateInput = {
        ...input,
        gameStarted: true,
        gameEnded: false,
        periodEnded: false,
        playInProgress: true,
        seriesKind: 'free_kick',
      }
      return { ...next, phase: getMatchPhase(next) }
    }
    case 'period_started': {
      // Q1 / Q3 kickoffs can set seriesKind to free_kick when that flow is wired.
      const startingPeriod = input.clock.period + (input.gameStarted ? 1 : 0)
      const period =
        event.openingKickoff || !input.gameStarted ? 1 : startingPeriod
      const next: MatchStateInput = {
        ...input,
        gameStarted: true,
        periodEnded: false,
        playInProgress: false,
        // Until free-kick collection UI exists, keep scrimmage operable after period start.
        seriesKind: event.openingKickoff ? 'free_kick' : 'scrimmage',
        clock: { ...input.clock, period },
      }
      return { ...next, phase: getMatchPhase(next) }
    }
    case 'snap': {
      const next: MatchStateInput = {
        ...input,
        playInProgress: true,
        seriesKind: 'scrimmage',
      }
      return { ...next, phase: getMatchPhase(next) }
    }
    case 'end_play': {
      const seriesKind: SeriesKind = event.scoredTouchdown
        ? 'try'
        : (event.nextSeries ?? 'scrimmage')
      const next: MatchStateInput = {
        ...input,
        playInProgress: false,
        seriesKind,
      }
      return { ...next, phase: getMatchPhase(next) }
    }
    case 'free_kick_resolved': {
      const next: MatchStateInput = {
        ...input,
        playInProgress: false,
        seriesKind: event.nextSeries ?? 'scrimmage',
      }
      return { ...next, phase: getMatchPhase(next) }
    }
    case 'try_resolved': {
      const next: MatchStateInput = {
        ...input,
        playInProgress: false,
        seriesKind: 'free_kick',
      }
      return { ...next, phase: getMatchPhase(next) }
    }
    case 'period_ended': {
      const next: MatchStateInput = {
        ...input,
        periodEnded: true,
        playInProgress: false,
      }
      return { ...next, phase: getMatchPhase(next) }
    }
    case 'overtime_started': {
      const next: MatchStateInput = {
        ...input,
        periodEnded: false,
        playInProgress: false,
        seriesKind: 'scrimmage',
      }
      return { ...next, phase: getMatchPhase(next) }
    }
    case 'game_ended': {
      const next: MatchStateInput = {
        ...input,
        gameEnded: true,
        playInProgress: false,
        periodEnded: true,
      }
      return { ...next, phase: getMatchPhase(next) }
    }
  }
}
