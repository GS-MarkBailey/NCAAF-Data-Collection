/**
 * Progressive play-collection steps.
 *
 * Kickoff series: Kickoff → Return | Touchback | …
 * Scrimmage (after SNAP): Run / PassAttempt / Punt trees.
 * Try (after touchdown): 1-pt kick / 2-pt play → result → kickoff.
 *
 * Yard presses are logged as datapoints continuously while the ball is live;
 * there is no CONFIRM YARDS button — yards ride alongside the next datapoints.
 *
 * `likelihood` is a relative weight for collector button emphasis only —
 * never shown as copy in the UI.
 */

export type PlayCollectionStepId =
  | 'choose_kickoff_result'
  | 'choose_return_end'
  | 'choose_recovery'
  | 'choose_play_type'
  | 'choose_pass_result'
  | 'choose_play_end'
  | 'choose_try_type'
  | 'choose_pat_result'
  | 'choose_two_point_result'
  | 'ready_to_end'

/** Visual emphasis derived from relative likelihood (not shown as text). */
export type CollectionButtonEmphasis = 'primary' | 'secondary' | 'tertiary'

export interface PlayCollectionOption {
  id: string
  label: string
  /**
   * Relative how-common weight among siblings (higher = more likely).
   * Drives button size/emphasis only — never rendered as a number in UI.
   */
  likelihood: number
  /** Catalog id when this choice maps to a known play type. */
  catalogId?: string
  /** Step to enter after this choice (null = stay / handled specially). */
  nextStep: PlayCollectionStepId | null
  /** If true, yards UI should show on the next step. */
  showYards?: boolean
  /** If true, END PLAY becomes available on the next step. */
  canEndPlay?: boolean
}

export interface PlayCollectionStepDef {
  id: PlayCollectionStepId
  label: string
  prompt: string
  options: PlayCollectionOption[]
  showYards: boolean
  canEndPlay: boolean
}

export interface PlayCollectionButton {
  id: string
  label: string
  catalogId?: string
  likelihood: number
  emphasis: CollectionButtonEmphasis
}

const STEPS: Record<PlayCollectionStepId, PlayCollectionStepDef> = {
  choose_kickoff_result: {
    id: 'choose_kickoff_result',
    label: 'Kickoff result',
    prompt: 'What happened on the kickoff?',
    showYards: false,
    canEndPlay: false,
    options: [
      {
        id: 'touchback',
        label: 'TOUCHBACK',
        likelihood: 70,
        catalogId: 'st.kickoff_touchback',
        nextStep: 'ready_to_end',
        canEndPlay: true,
      },
      {
        id: 'return',
        label: 'RETURN',
        likelihood: 24,
        catalogId: 'st.kickoff_return',
        nextStep: 'choose_return_end',
        showYards: true,
      },
      {
        id: 'fair_catch',
        label: 'FAIR CATCH',
        likelihood: 3,
        catalogId: 'st.fair_catch',
        nextStep: 'ready_to_end',
        showYards: true,
        canEndPlay: true,
      },
      {
        id: 'kick_out_of_bounds',
        label: 'OUT OF BOUNDS',
        likelihood: 2,
        catalogId: 'st.kickoff_out_of_bounds',
        nextStep: 'ready_to_end',
        canEndPlay: true,
      },
      {
        id: 'muff',
        label: 'MUFF',
        likelihood: 1,
        catalogId: 'turnover.muff',
        nextStep: 'choose_recovery',
      },
    ],
  },
  choose_return_end: {
    id: 'choose_return_end',
    label: 'Return end',
    prompt: 'How did the return end?',
    showYards: true,
    canEndPlay: false,
    options: [
      {
        id: 'tackle',
        label: 'TACKLE',
        likelihood: 78,
        nextStep: 'ready_to_end',
        canEndPlay: true,
        showYards: true,
      },
      {
        id: 'return_out_of_bounds',
        label: 'OUT OF BOUNDS',
        likelihood: 14,
        nextStep: 'ready_to_end',
        canEndPlay: true,
        showYards: true,
      },
      {
        id: 'return_fumble',
        label: 'FUMBLE',
        likelihood: 5,
        catalogId: 'turnover.fumble_lost',
        nextStep: 'choose_recovery',
        showYards: true,
      },
      {
        id: 'return_touchdown',
        label: 'TOUCHDOWN',
        likelihood: 3,
        catalogId: 'score.touchdown',
        nextStep: 'ready_to_end',
        canEndPlay: true,
      },
    ],
  },
  choose_recovery: {
    id: 'choose_recovery',
    label: 'Recovery',
    prompt: 'Who recovered?',
    showYards: true,
    canEndPlay: false,
    options: [
      {
        id: 'recovery_receiving',
        label: 'RECEIVING TEAM',
        likelihood: 65,
        nextStep: 'ready_to_end',
        canEndPlay: true,
        showYards: true,
      },
      {
        id: 'recovery_kicking',
        label: 'KICKING TEAM',
        likelihood: 35,
        nextStep: 'ready_to_end',
        canEndPlay: true,
        showYards: true,
      },
    ],
  },
  choose_play_type: {
    id: 'choose_play_type',
    label: 'Play type',
    prompt: 'What kind of play?',
    showYards: false,
    canEndPlay: false,
    options: [
      {
        id: 'throw',
        label: 'PASS ATTEMPT',
        likelihood: 52,
        nextStep: 'choose_pass_result',
      },
      {
        id: 'rush',
        label: 'RUN',
        likelihood: 42,
        catalogId: 'play.rush',
        nextStep: 'choose_play_end',
        showYards: true,
      },
      {
        id: 'punt',
        label: 'PUNT',
        likelihood: 6,
        catalogId: 'st.punt',
        nextStep: 'ready_to_end',
        showYards: true,
        canEndPlay: true,
      },
    ],
  },
  choose_pass_result: {
    id: 'choose_pass_result',
    label: 'Pass result',
    prompt: 'What happened on the pass?',
    showYards: false,
    canEndPlay: false,
    options: [
      {
        id: 'catch',
        label: 'COMPLETE PASS',
        likelihood: 48,
        catalogId: 'play.pass_complete',
        nextStep: 'choose_play_end',
        showYards: true,
      },
      {
        id: 'incomplete',
        label: 'INCOMPLETE PASS',
        likelihood: 38,
        catalogId: 'play.pass_incomplete',
        nextStep: 'ready_to_end',
        canEndPlay: true,
      },
      {
        id: 'out_of_bounds',
        label: 'OUT OF BOUNDS',
        likelihood: 8,
        catalogId: 'play.pass_incomplete',
        nextStep: 'ready_to_end',
        canEndPlay: true,
      },
      {
        id: 'interception',
        label: 'INTERCEPTION',
        likelihood: 6,
        catalogId: 'turnover.interception',
        nextStep: 'ready_to_end',
        canEndPlay: true,
      },
    ],
  },
  choose_play_end: {
    id: 'choose_play_end',
    label: 'Play end',
    prompt: 'How did the play end?',
    showYards: true,
    canEndPlay: false,
    options: [
      {
        id: 'tackle',
        label: 'TACKLE',
        likelihood: 72,
        nextStep: 'ready_to_end',
        canEndPlay: true,
        showYards: true,
      },
      {
        id: 'play_out_of_bounds',
        label: 'OUT OF BOUNDS',
        likelihood: 16,
        nextStep: 'ready_to_end',
        canEndPlay: true,
        showYards: true,
      },
      {
        id: 'touchdown',
        label: 'TOUCHDOWN',
        likelihood: 7,
        catalogId: 'score.touchdown',
        nextStep: 'ready_to_end',
        canEndPlay: true,
        showYards: true,
      },
      {
        id: 'play_fumble',
        label: 'FUMBLE',
        likelihood: 5,
        catalogId: 'turnover.fumble_lost',
        nextStep: 'ready_to_end',
        canEndPlay: true,
        showYards: true,
      },
    ],
  },
  choose_try_type: {
    id: 'choose_try_type',
    label: 'Try type',
    prompt: 'What kind of convert?',
    showYards: false,
    canEndPlay: false,
    options: [
      {
        id: 'pat_kick',
        label: '1-PT KICK',
        likelihood: 88,
        catalogId: 'score.conversion_kick',
        nextStep: 'choose_pat_result',
      },
      {
        id: 'two_point',
        label: '2-PT PLAY',
        likelihood: 12,
        catalogId: 'score.conversion_play',
        nextStep: 'choose_two_point_result',
        showYards: true,
      },
    ],
  },
  choose_pat_result: {
    id: 'choose_pat_result',
    label: 'Kick result',
    prompt: 'Was the kick good?',
    showYards: false,
    canEndPlay: false,
    options: [
      {
        id: 'pat_good',
        label: 'GOOD',
        likelihood: 92,
        catalogId: 'score.conversion_kick',
        nextStep: 'ready_to_end',
        canEndPlay: true,
      },
      {
        id: 'pat_no_good',
        label: 'NO GOOD',
        likelihood: 8,
        nextStep: 'ready_to_end',
        canEndPlay: true,
      },
    ],
  },
  choose_two_point_result: {
    id: 'choose_two_point_result',
    label: 'Two-point result',
    prompt: 'What happened on the two-point try?',
    showYards: true,
    canEndPlay: false,
    options: [
      {
        id: 'two_point_good',
        label: 'GOOD',
        likelihood: 48,
        catalogId: 'score.conversion_play',
        nextStep: 'ready_to_end',
        canEndPlay: true,
        showYards: true,
      },
      {
        id: 'two_point_no_good',
        label: 'NO GOOD',
        likelihood: 48,
        nextStep: 'ready_to_end',
        canEndPlay: true,
        showYards: true,
      },
      {
        id: 'defensive_two_point',
        label: 'DEFENSE SCORES',
        likelihood: 4,
        catalogId: 'score.defensive_conversion',
        nextStep: 'ready_to_end',
        canEndPlay: true,
      },
    ],
  },
  ready_to_end: {
    id: 'ready_to_end',
    label: 'End play',
    prompt: 'Ready to end the play',
    showYards: true,
    canEndPlay: true,
    options: [],
  },
}

/** Opening kickoff collection (after KICK OFF button). */
export const INITIAL_KICKOFF_COLLECTION_STEP: PlayCollectionStepId =
  'choose_kickoff_result'

/** Scrimmage collection after SNAP. */
export const INITIAL_PLAY_COLLECTION_STEP: PlayCollectionStepId =
  'choose_play_type'

/** Try / convert collection after a touchdown. */
export const INITIAL_TRY_COLLECTION_STEP: PlayCollectionStepId =
  'choose_try_type'

/** NCAA-style try spot (offense-relative yard line). */
export const TRY_SPOT_BALL_ON = 3

export function getPlayCollectionStep(
  stepId: PlayCollectionStepId | null | undefined,
): PlayCollectionStepDef | null {
  if (!stepId) return null
  return STEPS[stepId] ?? null
}

/**
 * Map relative likelihood among siblings → button emphasis.
 * Top tier ≈ primary; mid ≈ secondary; rare ≈ tertiary.
 */
export function emphasisForLikelihood(
  likelihood: number,
  siblingLikelihoods: readonly number[],
): CollectionButtonEmphasis {
  if (siblingLikelihoods.length === 0) return 'primary'
  const max = Math.max(...siblingLikelihoods)
  if (max <= 0) return 'secondary'
  const ratio = likelihood / max
  if (ratio >= 0.85) return 'primary'
  if (ratio >= 0.3) return 'secondary'
  return 'tertiary'
}

export function resolvePlayCollectionChoice(
  stepId: PlayCollectionStepId,
  optionId: string,
  _path: readonly string[] = [],
): {
  option: PlayCollectionOption
  nextStep: PlayCollectionStepId
  showYards: boolean
  canEndPlay: boolean
} | null {
  const step = STEPS[stepId]
  const option = step?.options.find((entry) => entry.id === optionId)
  if (!step || !option || !option.nextStep) return null

  const next = STEPS[option.nextStep]
  return {
    option,
    nextStep: option.nextStep,
    showYards: option.showYards ?? next.showYards,
    canEndPlay: option.canEndPlay ?? next.canEndPlay,
  }
}

/** Buttons + yard/end-play flags for the current collection step. */
export function getPlayCollectionView(
  stepId: PlayCollectionStepId | null | undefined,
  _path: readonly string[] = [],
): {
  step: PlayCollectionStepDef | null
  buttons: PlayCollectionButton[]
  showYards: boolean
  canEndPlay: boolean
} {
  const step = getPlayCollectionStep(stepId)
  if (!step) {
    return { step: null, buttons: [], showYards: false, canEndPlay: false }
  }

  const weights = step.options.map((option) => option.likelihood)
  const buttons = [...step.options]
    .sort((a, b) => b.likelihood - a.likelihood)
    .map((option) => ({
      id: option.id,
      label: option.label,
      catalogId: option.catalogId,
      likelihood: option.likelihood,
      emphasis: emphasisForLikelihood(option.likelihood, weights),
    }))

  return {
    step,
    buttons,
    showYards: step.showYards,
    canEndPlay: step.canEndPlay,
  }
}
