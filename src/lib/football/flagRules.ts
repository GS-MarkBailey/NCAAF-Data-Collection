/**
 * Flag (penalty) types and association-specific enforcement.
 *
 * Source of truth for later operator flag collection. Official rulebooks still
 * win on simultaneous fouls, double-foul, 10-second runoff, and other edges.
 * Do not collapse NCAA / NFL / CFL into one yardage number.
 */

import type { FootballCode } from './rulesets'

export type FlagTypeId = `flag.${string}`

export type FlagCategory =
  | 'pre_snap'
  | 'line'
  | 'pass'
  | 'personal'
  | 'unsportsmanlike'
  | 'kick'
  | 'substitution'
  | 'clock'
  | 'other'

/** Who the foul is typically charged against. */
export type FlagAgainst =
  | 'offense'
  | 'defense'
  | 'kicking'
  | 'receiving'
  | 'either'

/** Where accepted yardage is measured from. */
export type EnforcementSpot =
  | 'previous'
  | 'spot_of_foul'
  | 'succeeding'
  | 'end_of_run'
  | 'pocket_or_spot'
  | 'behind_los_previous_else_spot'
  | 'choice'
  | 'varies'

export type DownEffect =
  | 'replay'
  | 'loss_of_down'
  | 'automatic_first_down'
  | 'none'
  | 'varies'

export type YardageSpec =
  | { kind: 'fixed'; yards: 5 | 10 | 15 }
  | { kind: 'spot_foul' }
  | {
      kind: 'spot_foul_end_zone'
      /** Offense-relative ball-on if the foul is in the end zone. */
      ballOn: number
    }
  | { kind: 'options'; summary: string }
  | { kind: 'varies'; summary: string }

export interface AssociationFlagRule {
  applies: true
  yardage: YardageSpec
  from: EnforcementSpot
  downEffect: DownEffect
  /** Half-the-distance-to-goal when fixed yards would reach / pass the GL. */
  halfDistanceToGoal: boolean
  canDisqualify: boolean
  typicallyDeadBall: boolean
  safetyIfInOwnEndZone?: boolean
  notes?: string
}

export interface AssociationFlagAbsent {
  applies: false
  /** What this association uses instead, or why the foul is not called this way. */
  notes: string
}

export type AssociationFlagEntry = AssociationFlagRule | AssociationFlagAbsent

type SeriesKind = 'scrimmage' | 'free_kick' | 'try'

export interface FlagType {
  id: FlagTypeId
  label: string
  description: string
  category: FlagCategory
  against: FlagAgainst
  /** Series where this foul is commonly available. */
  series: readonly SeriesKind[]
  associations: Record<FootballCode, AssociationFlagEntry>
}

export type FlagDecision = 'pending' | 'accepted' | 'declined' | 'offset'

/** One collected flag on a game session (collection UI not shipped yet). */
export interface FlagEvent {
  id: string
  typeId: FlagTypeId
  againstHome: boolean
  decision: FlagDecision
  rulesetId: FootballCode
  period: number
  clockSeconds: number
  collectedAt: number
}

const SCRIMMAGE: readonly SeriesKind[] = ['scrimmage']
const KICK: readonly SeriesKind[] = ['free_kick', 'scrimmage']
const ALL_SERIES: readonly SeriesKind[] = ['scrimmage', 'free_kick', 'try']
const TRY_AND_SCRIMMAGE: readonly SeriesKind[] = ['scrimmage', 'try']

function fixed(
  yards: 5 | 10 | 15,
  extra: Omit<AssociationFlagRule, 'applies' | 'yardage'> & {
    yardage?: YardageSpec
  },
): AssociationFlagRule {
  const { yardage, ...rest } = extra
  return { applies: true, yardage: yardage ?? { kind: 'fixed', yards }, ...rest }
}

function absent(notes: string): AssociationFlagAbsent {
  return { applies: false, notes }
}

const DEAD_5_REPLAY = {
  from: 'previous' as const,
  downEffect: 'replay' as const,
  halfDistanceToGoal: true,
  canDisqualify: false,
  typicallyDeadBall: true,
}

const LIVE_5_REPLAY = {
  from: 'previous' as const,
  downEffect: 'replay' as const,
  halfDistanceToGoal: true,
  canDisqualify: false,
  typicallyDeadBall: false,
}

const PF_15_DEFENSE = {
  from: 'previous' as const,
  downEffect: 'automatic_first_down' as const,
  halfDistanceToGoal: true,
  canDisqualify: true,
  typicallyDeadBall: false,
}

const PF_15_OFFENSE = {
  from: 'previous' as const,
  downEffect: 'none' as const,
  halfDistanceToGoal: true,
  canDisqualify: true,
  typicallyDeadBall: false,
}

function flag(
  partial: Omit<FlagType, 'associations'> & {
    associations: Record<FootballCode, AssociationFlagEntry>
  },
): FlagType {
  return partial
}

/**
 * All flag types. Lookup with `getFlagType` / `flagTypesForAssociation`.
 * Yardage and down effect differ by association — always pass `rulesetId`.
 */
export const FLAG_TYPES: readonly FlagType[] = [
  // —— Pre-snap / procedure ——
  flag({
    id: 'flag.false_start',
    label: 'False start',
    description: 'Offense moves illegally before the snap.',
    category: 'pre_snap',
    against: 'offense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(5, { ...DEAD_5_REPLAY }),
      nfl: fixed(5, { ...DEAD_5_REPLAY }),
      cfl: absent('CFL groups this under illegal procedure.'),
    },
  }),
  flag({
    id: 'flag.illegal_procedure',
    label: 'Illegal procedure',
    description: 'CFL umbrella for many pre-snap / formation procedure fouls.',
    category: 'pre_snap',
    against: 'offense',
    series: SCRIMMAGE,
    associations: {
      ncaa: absent('NCAA uses false start, illegal formation, illegal snap, etc.'),
      nfl: absent('NFL uses false start, illegal formation, illegal snap, etc.'),
      cfl: fixed(5, { ...DEAD_5_REPLAY }),
    },
  }),
  flag({
    id: 'flag.encroachment',
    label: 'Encroachment',
    description:
      'Defender enters the neutral zone and contacts an opponent before the snap.',
    category: 'pre_snap',
    against: 'defense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(5, { ...DEAD_5_REPLAY }),
      nfl: fixed(5, { ...DEAD_5_REPLAY }),
      cfl: absent('CFL typically calls offside.'),
    },
  }),
  flag({
    id: 'flag.offside',
    label: 'Offside',
    description: 'Player lined up in / beyond the neutral zone at the snap.',
    category: 'pre_snap',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(5, { ...LIVE_5_REPLAY, downEffect: 'varies', notes: 'Live-ball offside may be declined for the play result.' }),
      nfl: fixed(5, { ...LIVE_5_REPLAY, downEffect: 'varies', notes: 'Live-ball offside may be declined for the play result.' }),
      cfl: fixed(5, { ...LIVE_5_REPLAY, downEffect: 'varies' }),
    },
  }),
  flag({
    id: 'flag.neutral_zone_infraction',
    label: 'Neutral zone infraction',
    description:
      'Defender causes an offensive player to react in the neutral zone (NFL).',
    category: 'pre_snap',
    against: 'defense',
    series: SCRIMMAGE,
    associations: {
      ncaa: absent('NCAA uses offside / encroachment.'),
      nfl: fixed(5, { ...DEAD_5_REPLAY }),
      cfl: absent('CFL uses offside.'),
    },
  }),
  flag({
    id: 'flag.delay_of_game',
    label: 'Delay of game',
    description: 'Failure to put the ball in play before the play clock expires.',
    category: 'clock',
    against: 'offense',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(5, { ...DEAD_5_REPLAY }),
      nfl: fixed(5, {
        ...DEAD_5_REPLAY,
        notes: 'Defense delay of game also exists (5 yards).',
      }),
      cfl: absent('CFL uses time count (5, or 10 in the last three minutes).'),
    },
  }),
  flag({
    id: 'flag.delay_of_game_defense',
    label: 'Delay of game (defense)',
    description: 'Defense delays the snap / ready (NFL).',
    category: 'clock',
    against: 'defense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(5, { ...DEAD_5_REPLAY, notes: 'NCAA defensive delay of game is 5 yards from the previous spot.' }),
      nfl: fixed(5, { ...DEAD_5_REPLAY, downEffect: 'automatic_first_down' }),
      cfl: absent('CFL uses time count charged to the appropriate team.'),
    },
  }),
  flag({
    id: 'flag.time_count',
    label: 'Time count',
    description: 'CFL play-clock / time-count foul.',
    category: 'clock',
    against: 'offense',
    series: ALL_SERIES,
    associations: {
      ncaa: absent('NCAA uses delay of game.'),
      nfl: absent('NFL uses delay of game.'),
      cfl: {
        applies: true,
        yardage: { kind: 'varies', summary: '5 yards; 10 yards in the last 3 minutes in some cases' },
        from: 'previous',
        downEffect: 'replay',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: true,
      },
    },
  }),
  flag({
    id: 'flag.illegal_formation',
    label: 'Illegal formation',
    description: 'Fewer than required players on the line, covered receivers, etc.',
    category: 'pre_snap',
    against: 'offense',
    series: TRY_AND_SCRIMMAGE,
    associations: {
      ncaa: fixed(5, { ...DEAD_5_REPLAY, typicallyDeadBall: false }),
      nfl: fixed(5, { ...DEAD_5_REPLAY, typicallyDeadBall: false }),
      cfl: absent('Usually illegal procedure.'),
    },
  }),
  flag({
    id: 'flag.illegal_motion',
    label: 'Illegal motion',
    description: 'Player in motion moving illegally toward the line at the snap.',
    category: 'pre_snap',
    against: 'offense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(5, { ...LIVE_5_REPLAY }),
      nfl: fixed(5, { ...LIVE_5_REPLAY }),
      cfl: fixed(5, {
        ...LIVE_5_REPLAY,
        notes: 'CFL allows multiple players in motion; infraction is still 5 yards when illegal.',
      }),
    },
  }),
  flag({
    id: 'flag.illegal_shift',
    label: 'Illegal shift',
    description: 'Team fails to reset for one second after a shift.',
    category: 'pre_snap',
    against: 'offense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(5, { ...LIVE_5_REPLAY }),
      nfl: fixed(5, { ...LIVE_5_REPLAY }),
      cfl: absent('CFL motion/shift rules differ; often illegal procedure.'),
    },
  }),
  flag({
    id: 'flag.illegal_snap',
    label: 'Illegal snap',
    description: 'Snapper lifts the ball or fails to snap legally.',
    category: 'pre_snap',
    against: 'offense',
    series: TRY_AND_SCRIMMAGE,
    associations: {
      ncaa: fixed(5, { ...DEAD_5_REPLAY }),
      nfl: fixed(5, { ...DEAD_5_REPLAY }),
      cfl: absent('Usually illegal procedure.'),
    },
  }),
  flag({
    id: 'flag.ineligible_number',
    label: 'Ineligible number / reporting',
    description: 'Player wearing an ineligible number not reported as eligible.',
    category: 'pre_snap',
    against: 'offense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(5, { ...LIVE_5_REPLAY }),
      nfl: fixed(5, { ...LIVE_5_REPLAY }),
      cfl: fixed(5, { ...LIVE_5_REPLAY }),
    },
  }),

  // —— Line / blocking ——
  flag({
    id: 'flag.offensive_holding',
    label: 'Offensive holding',
    description: 'Illegal grab / restrict by an offensive player.',
    category: 'line',
    against: 'offense',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(10, {
        from: 'spot_of_foul',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        safetyIfInOwnEndZone: true,
        notes: 'Often previous-spot if the foul is behind the line; half-distance in the field of play near the GL.',
      }),
      nfl: fixed(10, {
        from: 'behind_los_previous_else_spot',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        safetyIfInOwnEndZone: true,
        notes: 'Behind LOS: previous spot. Beyond LOS: spot of the foul.',
      }),
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
    },
  }),
  flag({
    id: 'flag.defensive_holding',
    label: 'Defensive holding',
    description: 'Illegal hold by a defender, often in pass coverage.',
    category: 'pass',
    against: 'defense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(10, {
        from: 'previous',
        downEffect: 'automatic_first_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      nfl: fixed(5, {
        from: 'previous',
        downEffect: 'automatic_first_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: 'CFL holding is typically 10 from the previous spot; not the NFL 5 + automatic first down.',
      }),
    },
  }),
  flag({
    id: 'flag.illegal_block_in_back',
    label: 'Illegal block in the back',
    description: 'Block into the back of an opponent beyond legal exceptions.',
    category: 'line',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(10, {
        from: 'spot_of_foul',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      nfl: fixed(10, {
        from: 'spot_of_foul',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      cfl: fixed(10, {
        from: 'spot_of_foul',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
    },
  }),
  flag({
    id: 'flag.clipping',
    label: 'Clipping',
    description: 'Block below the waist from behind.',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, { ...PF_15_OFFENSE, from: 'spot_of_foul', downEffect: 'varies' }),
      nfl: fixed(15, { ...PF_15_OFFENSE, from: 'spot_of_foul', downEffect: 'varies' }),
      cfl: fixed(15, { ...PF_15_OFFENSE, from: 'spot_of_foul', downEffect: 'varies' }),
    },
  }),
  flag({
    id: 'flag.chop_block',
    label: 'Chop block',
    description: 'High-low combination block on the same defender.',
    category: 'personal',
    against: 'offense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(15, { ...PF_15_OFFENSE }),
      nfl: fixed(15, { ...PF_15_OFFENSE }),
      cfl: fixed(15, { ...PF_15_OFFENSE }),
    },
  }),
  flag({
    id: 'flag.crackback',
    label: 'Crackback block',
    description: 'Illegal crackback / peel-back style block.',
    category: 'personal',
    against: 'offense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(15, { ...PF_15_OFFENSE }),
      nfl: fixed(15, { ...PF_15_OFFENSE }),
      cfl: fixed(15, { ...PF_15_OFFENSE }),
    },
  }),
  flag({
    id: 'flag.peel_back',
    label: 'Peel-back block',
    description: 'Illegal block back toward the original position of the ball.',
    category: 'personal',
    against: 'offense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(15, { ...PF_15_OFFENSE }),
      nfl: fixed(15, { ...PF_15_OFFENSE }),
      cfl: fixed(15, { ...PF_15_OFFENSE }),
    },
  }),
  flag({
    id: 'flag.tripping',
    label: 'Tripping',
    description: 'Using the leg to trip an opponent.',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(10, {
        from: 'previous',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: 'NCAA tripping is 10 yards (not 15).',
      }),
      nfl: fixed(10, {
        from: 'previous',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
    },
  }),
  flag({
    id: 'flag.helping_runner',
    label: 'Helping the runner',
    description: 'Teammate pushes / pulls the ball carrier illegally.',
    category: 'line',
    against: 'offense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(5, {
        from: 'spot_of_foul',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      nfl: fixed(10, {
        from: 'spot_of_foul',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: 'NFL assisting the runner is 10 yards.',
      }),
      cfl: absent('Not a standard CFL named foul; similar acts fall under illegal interference / procedure.'),
    },
  }),
  flag({
    id: 'flag.illegal_hands_to_face',
    label: 'Hands to the face',
    description: 'Open / closed hand to the facemask / face (non-grasp variant).',
    category: 'personal',
    against: 'either',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(10, {
        from: 'previous',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      nfl: fixed(10, {
        from: 'previous',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      cfl: absent('Typically illegal contact / objectionable / rough play.'),
    },
  }),
  flag({
    id: 'flag.illegal_use_of_hands',
    label: 'Illegal use of hands',
    description: 'Hands to the neck / head or other illegal hand use.',
    category: 'line',
    against: 'either',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(10, {
        from: 'previous',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      nfl: fixed(10, {
        from: 'previous',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
    },
  }),

  // —— Pass game ——
  flag({
    id: 'flag.defensive_pass_interference',
    label: 'Defensive pass interference',
    description:
      'Illegal contact that hinders an eligible receiver’s opportunity to catch a forward pass.',
    category: 'pass',
    against: 'defense',
    series: TRY_AND_SCRIMMAGE,
    associations: {
      ncaa: {
        applies: true,
        yardage: { kind: 'spot_foul_end_zone', ballOn: 2 },
        from: 'spot_of_foul',
        downEffect: 'automatic_first_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: 'Spot foul. In the end zone the ball is placed at the two-yard line.',
      },
      nfl: {
        applies: true,
        yardage: { kind: 'spot_foul_end_zone', ballOn: 1 },
        from: 'spot_of_foul',
        downEffect: 'automatic_first_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: 'Spot foul (no 15-yard cap). In the end zone the ball is placed at the one-yard line.',
      },
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'automatic_first_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: 'CFL DPI is 10 yards from the previous spot — not a full spot foul. Goal-area fouls spot at the one.',
      }),
    },
  }),
  flag({
    id: 'flag.offensive_pass_interference',
    label: 'Offensive pass interference',
    description:
      'Illegal contact by an eligible receiver / teammate on a forward pass play.',
    category: 'pass',
    against: 'offense',
    series: TRY_AND_SCRIMMAGE,
    associations: {
      ncaa: fixed(15, {
        from: 'previous',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: 'NCAA OPI is 15 from the previous spot (not 10).',
      }),
      nfl: fixed(10, {
        from: 'previous',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: 'NFL OPI is 10 from the previous spot.',
      }),
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
    },
  }),
  flag({
    id: 'flag.illegal_contact',
    label: 'Illegal contact',
    description: 'Defender contacts a receiver beyond 5 yards downfield (NFL).',
    category: 'pass',
    against: 'defense',
    series: SCRIMMAGE,
    associations: {
      ncaa: absent('NCAA does not use NFL illegal-contact (5-yard) as a separate foul.'),
      nfl: fixed(5, {
        from: 'previous',
        downEffect: 'automatic_first_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      cfl: absent('CFL illegal contact on a receiver is a different 10-yard foul.'),
    },
  }),
  flag({
    id: 'flag.illegal_contact_receiver',
    label: 'Illegal contact on a receiver',
    description: 'CFL: illegal contact with an eligible receiver.',
    category: 'pass',
    against: 'defense',
    series: SCRIMMAGE,
    associations: {
      ncaa: absent('NCAA uses DPI / holding / UR.'),
      nfl: absent('NFL uses illegal contact (5) / DPI / holding.'),
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
    },
  }),
  flag({
    id: 'flag.ineligible_downfield',
    label: 'Ineligible receiver downfield',
    description: 'Lineman illegally downfield on a forward pass.',
    category: 'pass',
    against: 'offense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(5, { ...LIVE_5_REPLAY, typicallyDeadBall: false, downEffect: 'none' }),
      nfl: fixed(5, { ...LIVE_5_REPLAY, typicallyDeadBall: false, downEffect: 'none' }),
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: 'CFL ineligible receiver downfield is commonly 10 yards.',
      }),
    },
  }),
  flag({
    id: 'flag.illegal_forward_pass',
    label: 'Illegal forward pass',
    description:
      'Second forward pass, pass beyond the LOS, or pass after the ball crossed the LOS.',
    category: 'pass',
    against: 'offense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(5, {
        from: 'previous',
        downEffect: 'loss_of_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      nfl: fixed(5, {
        from: 'previous',
        downEffect: 'loss_of_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'loss_of_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: 'CFL illegal forward pass is typically 10 yards and loss of down.',
      }),
    },
  }),
  flag({
    id: 'flag.intentional_grounding',
    label: 'Intentional grounding',
    description:
      'Passer throws the ball away to avoid a sack without an eligible receiver in the area.',
    category: 'pass',
    against: 'offense',
    series: SCRIMMAGE,
    associations: {
      ncaa: {
        applies: true,
        yardage: { kind: 'spot_foul' },
        from: 'spot_of_foul',
        downEffect: 'loss_of_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        safetyIfInOwnEndZone: true,
        notes: 'Spot of the foul and loss of down. Safety if the passer is in their own end zone.',
      },
      nfl: {
        applies: true,
        yardage: { kind: 'spot_foul' },
        from: 'pocket_or_spot',
        downEffect: 'loss_of_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        safetyIfInOwnEndZone: true,
        notes: 'In the pocket: previous LOS + loss of down. Outside the pocket: spot of the foul + loss of down. Safety in own end zone.',
      },
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'loss_of_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        safetyIfInOwnEndZone: true,
        notes: 'CFL intentionally grounding is 10 from the previous spot and loss of down (not an NCAA-style spot).',
      }),
    },
  }),
  flag({
    id: 'flag.illegal_touching',
    label: 'Illegal touching',
    description: 'Ineligible offensive player touches a forward pass.',
    category: 'pass',
    against: 'offense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(5, {
        from: 'previous',
        downEffect: 'loss_of_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: 'NCAA illegal touching of a forward pass is 5 yards and loss of down.',
      }),
      nfl: {
        applies: true,
        yardage: { kind: 'varies', summary: 'Loss of down at the previous spot (no yardage) in many cases' },
        from: 'previous',
        downEffect: 'loss_of_down',
        halfDistanceToGoal: false,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: 'NFL illegal touching is often loss of down without yardage; confirm current book for the specific act.',
      },
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'loss_of_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
    },
  }),
  flag({
    id: 'flag.illegal_forward_handing',
    label: 'Illegal forward handing',
    description: 'Handing the ball forward beyond the line or to an ineligible player illegally.',
    category: 'pass',
    against: 'offense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(5, {
        from: 'spot_of_foul',
        downEffect: 'loss_of_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      nfl: fixed(5, {
        from: 'spot_of_foul',
        downEffect: 'loss_of_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'loss_of_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
    },
  }),

  // —— Personal fouls / safety ——
  flag({
    id: 'flag.unnecessary_roughness',
    label: 'Unnecessary roughness',
    description: 'Late / excessive contact beyond the play.',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies', notes: 'Automatic first down if against the defense.' }),
      nfl: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies', notes: 'Automatic first down if against the defense.' }),
      cfl: absent('CFL uses rough play (15) and objectionable conduct (10).'),
    },
  }),
  flag({
    id: 'flag.rough_play',
    label: 'Rough play',
    description: 'CFL personal-foul equivalent of unnecessary roughness.',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: absent('NCAA uses unnecessary roughness / personal foul.'),
      nfl: absent('NFL uses unnecessary roughness / personal foul.'),
      cfl: fixed(15, {
        ...PF_15_DEFENSE,
        downEffect: 'varies',
        canDisqualify: true,
      }),
    },
  }),
  flag({
    id: 'flag.personal_foul',
    label: 'Personal foul',
    description: 'Generic personal-foul bucket when a more specific code is unavailable.',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies' }),
      nfl: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies' }),
      cfl: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies', notes: 'Prefer rough play when known.' }),
    },
  }),
  flag({
    id: 'flag.facemask',
    label: 'Face mask',
    description: 'Grasping / twisting the face mask.',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies', notes: 'Incidental 5-yard facemask is gone; grasping is 15.' }),
      nfl: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies', notes: 'Incidental 5-yard facemask is gone; grasping is 15.' }),
      cfl: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies' }),
    },
  }),
  flag({
    id: 'flag.horse_collar',
    label: 'Horse-collar tackle',
    description:
      'Tackler grabs inside the shoulder pads / jersey collar from behind and pulls down.',
    category: 'personal',
    against: 'defense',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, { ...PF_15_DEFENSE }),
      nfl: fixed(15, { ...PF_15_DEFENSE }),
      cfl: absent('Typically rough play.'),
    },
  }),
  flag({
    id: 'flag.roughing_passer',
    label: 'Roughing the passer',
    description: 'Illegal hit on the quarterback after / during the throw.',
    category: 'personal',
    against: 'defense',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(15, {
        ...PF_15_DEFENSE,
        from: 'end_of_run',
        notes: '15 yards and automatic first down; succeeding-spot / end-of-run when the pass is completed.',
      }),
      nfl: fixed(15, {
        ...PF_15_DEFENSE,
        from: 'end_of_run',
        notes: '15 from the end of the last run when the pass is completed; otherwise previous. Automatic first down.',
      }),
      cfl: fixed(15, { ...PF_15_DEFENSE, from: 'end_of_run' }),
    },
  }),
  flag({
    id: 'flag.roughing_kicker',
    label: 'Roughing the kicker / holder',
    description: 'Illegal contact with the kicker or holder.',
    category: 'kick',
    against: 'defense',
    series: TRY_AND_SCRIMMAGE,
    associations: {
      ncaa: fixed(15, { ...PF_15_DEFENSE }),
      nfl: fixed(15, { ...PF_15_DEFENSE }),
      cfl: fixed(15, { ...PF_15_DEFENSE }),
    },
  }),
  flag({
    id: 'flag.roughing_snapper',
    label: 'Roughing the snapper',
    description: 'Illegal hit on the long snapper on a scrimmage kick / try.',
    category: 'kick',
    against: 'defense',
    series: TRY_AND_SCRIMMAGE,
    associations: {
      ncaa: fixed(15, { ...PF_15_DEFENSE }),
      nfl: fixed(15, { ...PF_15_DEFENSE }),
      cfl: fixed(15, { ...PF_15_DEFENSE }),
    },
  }),
  flag({
    id: 'flag.running_into_kicker',
    label: 'Running into the kicker',
    description: 'Lesser contact with the kicker (not roughing).',
    category: 'kick',
    against: 'defense',
    series: TRY_AND_SCRIMMAGE,
    associations: {
      ncaa: fixed(5, {
        from: 'previous',
        downEffect: 'replay',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: '5 yards; not an automatic first down.',
      }),
      nfl: fixed(5, {
        from: 'previous',
        downEffect: 'replay',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: '5 yards; not an automatic first down.',
      }),
      cfl: absent('CFL typically treats kicker contact as no yards / rough play rather than a 5-yard “running into”.'),
    },
  }),
  flag({
    id: 'flag.spearing',
    label: 'Spearing / crown-of-helmet',
    description: 'Initiating contact with the crown of the helmet.',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies', canDisqualify: true }),
      nfl: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies', canDisqualify: true }),
      cfl: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies', canDisqualify: true }),
    },
  }),
  flag({
    id: 'flag.targeting',
    label: 'Targeting',
    description:
      'NCAA: targeting the head/neck with the helmet / forearm / shoulder — ejection + replay review.',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, {
        ...PF_15_DEFENSE,
        downEffect: 'varies',
        canDisqualify: true,
        notes: '15 yards, disqualification, and replay review. Automatic first down if against the defense.',
      }),
      nfl: absent('NFL uses lowering the helmet / hit on a defenseless player / unnecessary roughness — not NCAA targeting.'),
      cfl: absent('CFL uses rough play / spearing — not NCAA targeting with mandated ejection review.'),
    },
  }),
  flag({
    id: 'flag.lowering_helmet',
    label: 'Lowering the head to initiate contact',
    description: 'NFL: using the helmet as a weapon by lowering the head to contact.',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: absent('NCAA charging this is usually targeting or spearing.'),
      nfl: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies', canDisqualify: true }),
      cfl: absent('Typically rough play.'),
    },
  }),
  flag({
    id: 'flag.hit_on_defenseless',
    label: 'Hit on a defenseless player',
    description: 'Illegal contact against a player in a defenseless posture.',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies', canDisqualify: true, notes: 'Often reviewed as targeting.' }),
      nfl: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies', canDisqualify: true }),
      cfl: fixed(15, { ...PF_15_DEFENSE, downEffect: 'varies', canDisqualify: true }),
    },
  }),
  flag({
    id: 'flag.hip_drop',
    label: 'Hip-drop tackle',
    description: 'NFL: tackler unweights and drops their hips onto the runner’s legs.',
    category: 'personal',
    against: 'defense',
    series: ALL_SERIES,
    associations: {
      ncaa: absent('Not a separately named NCAA foul as of the current catalog — may fall under UR.'),
      nfl: fixed(15, { ...PF_15_DEFENSE }),
      cfl: absent('Not a separately named CFL foul in this catalog.'),
    },
  }),
  flag({
    id: 'flag.blindside_block',
    label: 'Blindside block',
    description: 'Illegal blindside force block (force-into-head/neck variants by league).',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, { ...PF_15_OFFENSE, downEffect: 'varies' }),
      nfl: fixed(15, { ...PF_15_OFFENSE, downEffect: 'varies' }),
      cfl: fixed(15, { ...PF_15_OFFENSE, downEffect: 'varies' }),
    },
  }),
  flag({
    id: 'flag.low_block',
    label: 'Blocking below the waist / cut block',
    description: 'Illegal low block outside allowed zones.',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, { ...PF_15_OFFENSE, downEffect: 'varies' }),
      nfl: fixed(15, { ...PF_15_OFFENSE, downEffect: 'varies' }),
      cfl: fixed(15, { ...PF_15_OFFENSE, downEffect: 'varies' }),
    },
  }),
  flag({
    id: 'flag.late_hit',
    label: 'Late hit',
    description: 'Contact after the ball is dead / out of play.',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, {
        ...PF_15_DEFENSE,
        typicallyDeadBall: true,
        downEffect: 'varies',
        from: 'succeeding',
        notes: 'Dead-ball personal foul: 15 from the succeeding spot; AFD if against the defense.',
      }),
      nfl: fixed(15, {
        ...PF_15_DEFENSE,
        typicallyDeadBall: true,
        downEffect: 'varies',
        from: 'succeeding',
      }),
      cfl: fixed(15, {
        ...PF_15_DEFENSE,
        typicallyDeadBall: true,
        downEffect: 'varies',
        from: 'succeeding',
      }),
    },
  }),
  flag({
    id: 'flag.piling_on',
    label: 'Piling on',
    description: 'Driving into a player already down.',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, { ...PF_15_DEFENSE, typicallyDeadBall: true, from: 'succeeding', downEffect: 'varies' }),
      nfl: fixed(15, { ...PF_15_DEFENSE, typicallyDeadBall: true, from: 'succeeding', downEffect: 'varies' }),
      cfl: fixed(15, { ...PF_15_DEFENSE, typicallyDeadBall: true, from: 'succeeding', downEffect: 'varies' }),
    },
  }),
  flag({
    id: 'flag.fighting',
    label: 'Fighting',
    description: 'Striking / fighting; usually disqualification.',
    category: 'personal',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, { ...PF_15_DEFENSE, typicallyDeadBall: true, from: 'succeeding', downEffect: 'varies', canDisqualify: true }),
      nfl: fixed(15, { ...PF_15_DEFENSE, typicallyDeadBall: true, from: 'succeeding', downEffect: 'varies', canDisqualify: true }),
      cfl: fixed(15, { ...PF_15_DEFENSE, typicallyDeadBall: true, from: 'succeeding', downEffect: 'varies', canDisqualify: true }),
    },
  }),
  flag({
    id: 'flag.leaping',
    label: 'Leaping',
    description: 'Jumping over the snapper / line on a kick illegally.',
    category: 'kick',
    against: 'defense',
    series: TRY_AND_SCRIMMAGE,
    associations: {
      ncaa: fixed(15, { ...PF_15_DEFENSE }),
      nfl: fixed(15, { ...PF_15_DEFENSE }),
      cfl: fixed(15, { ...PF_15_DEFENSE }),
    },
  }),

  // —— Unsportsmanlike / conduct ——
  flag({
    id: 'flag.unsportsmanlike',
    label: 'Unsportsmanlike conduct',
    description: 'Taunting, celebrating excessively, abusive language, etc.',
    category: 'unsportsmanlike',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, {
        from: 'succeeding',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: true,
        typicallyDeadBall: true,
        notes: 'Usually dead-ball 15 from the succeeding spot. After a score, enforced on the kickoff. AFD if against the defense on a live-ball USC in some cases.',
      }),
      nfl: fixed(15, {
        from: 'succeeding',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: true,
        typicallyDeadBall: true,
      }),
      cfl: absent('CFL uses objectionable conduct (10 yards).'),
    },
  }),
  flag({
    id: 'flag.taunting',
    label: 'Taunting',
    description: 'Directed taunt at an opponent.',
    category: 'unsportsmanlike',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, {
        from: 'succeeding',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: true,
      }),
      nfl: fixed(15, {
        from: 'succeeding',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: true,
      }),
      cfl: absent('CFL: objectionable conduct.'),
    },
  }),
  flag({
    id: 'flag.objectionable_conduct',
    label: 'Objectionable conduct',
    description: 'CFL conduct foul analogous to unsportsmanlike.',
    category: 'unsportsmanlike',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: absent('NCAA uses unsportsmanlike conduct (15).'),
      nfl: absent('NFL uses unsportsmanlike conduct (15).'),
      cfl: fixed(10, {
        from: 'succeeding',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: true,
        typicallyDeadBall: true,
        notes: '10 yards — not the NCAA/NFL 15-yard USC.',
      }),
    },
  }),
  flag({
    id: 'flag.illegal_participation',
    label: 'Illegal participation',
    description: 'Too many players, player off the sideline participates, etc.',
    category: 'substitution',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(15, {
        from: 'previous',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      nfl: fixed(15, {
        from: 'previous',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      cfl: absent('CFL typically uses too many men (10).'),
    },
  }),
  flag({
    id: 'flag.too_many_men',
    label: 'Too many men on the field',
    description: 'More than the allowed number of players at the snap.',
    category: 'substitution',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(5, { ...LIVE_5_REPLAY, downEffect: 'varies' }),
      nfl: fixed(5, { ...LIVE_5_REPLAY, downEffect: 'varies' }),
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: 'CFL too many men is 10 yards, not 5.',
      }),
    },
  }),
  flag({
    id: 'flag.twelve_men',
    label: '12 men in the huddle / formation',
    description: 'Substitution huddle infraction (NFL/NCAA 12 in huddle).',
    category: 'substitution',
    against: 'either',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(5, { ...DEAD_5_REPLAY }),
      nfl: fixed(5, { ...DEAD_5_REPLAY }),
      cfl: absent('CFL substitution/too-many-men (10).'),
    },
  }),
  flag({
    id: 'flag.illegal_substitution',
    label: 'Illegal substitution',
    description: 'Substitution after the ready / during the play illegally.',
    category: 'substitution',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(5, { ...DEAD_5_REPLAY, typicallyDeadBall: false, downEffect: 'varies' }),
      nfl: fixed(5, { ...DEAD_5_REPLAY, typicallyDeadBall: false, downEffect: 'varies' }),
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
    },
  }),
  flag({
    id: 'flag.sideline_interference',
    label: 'Sideline interference',
    description: 'Team personnel illegally on the field / interfering from the sideline.',
    category: 'other',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: {
        applies: true,
        yardage: { kind: 'varies', summary: 'Warning, then 5 / 15 depending on occurrence' },
        from: 'succeeding',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: true,
      },
      nfl: {
        applies: true,
        yardage: { kind: 'varies', summary: 'Warning, then 5 / 15 depending on occurrence' },
        from: 'succeeding',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: true,
      },
      cfl: fixed(10, {
        from: 'succeeding',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: true,
        notes: 'Often objectionable conduct (10).',
      }),
    },
  }),

  // —— Kicking ——
  flag({
    id: 'flag.fair_catch_interference',
    label: 'Fair catch interference',
    description: 'Contact with a receiver who has signaled fair catch.',
    category: 'kick',
    against: 'kicking',
    series: KICK,
    associations: {
      ncaa: fixed(15, {
        from: 'spot_of_foul',
        downEffect: 'automatic_first_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      nfl: fixed(15, {
        from: 'spot_of_foul',
        downEffect: 'automatic_first_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      cfl: absent('CFL uses no yards (no fair catch).'),
    },
  }),
  flag({
    id: 'flag.kick_catch_interference',
    label: 'Kick-catch interference',
    description: 'Interference with a player attempting to catch a scrimmage kick.',
    category: 'kick',
    against: 'kicking',
    series: KICK,
    associations: {
      ncaa: fixed(15, {
        from: 'spot_of_foul',
        downEffect: 'automatic_first_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      nfl: fixed(15, {
        from: 'spot_of_foul',
        downEffect: 'automatic_first_down',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      cfl: absent('CFL uses no yards.'),
    },
  }),
  flag({
    id: 'flag.no_yards',
    label: 'No yards',
    description:
      'CFL: offside kicking player within 5 yards of a receiver fielding a kick.',
    category: 'kick',
    against: 'kicking',
    series: KICK,
    associations: {
      ncaa: absent('NCAA uses kick-catch / fair-catch interference (15).'),
      nfl: absent('NFL uses kick-catch / fair-catch interference (15).'),
      cfl: {
        applies: true,
        yardage: { kind: 'varies', summary: '5 yards (no contact) or 15 yards (contact / reckless)' },
        from: 'spot_of_foul',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
        notes: 'Distance depends on contact and whether the ball was touched.',
      },
    },
  }),
  flag({
    id: 'flag.illegally_downfield_on_kick',
    label: 'Illegally downfield on kick',
    description: 'Player illegally beyond the line on a scrimmage kick.',
    category: 'kick',
    against: 'kicking',
    series: SCRIMMAGE,
    associations: {
      ncaa: fixed(5, { ...LIVE_5_REPLAY, typicallyDeadBall: false, downEffect: 'none' }),
      nfl: fixed(5, { ...LIVE_5_REPLAY, typicallyDeadBall: false, downEffect: 'none' }),
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'none',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
    },
  }),
  flag({
    id: 'flag.kickoff_out_of_bounds',
    label: 'Kickoff out of bounds',
    description: 'Free kick goes out of bounds without being touched.',
    category: 'kick',
    against: 'kicking',
    series: ['free_kick'],
    associations: {
      ncaa: {
        applies: true,
        yardage: {
          kind: 'options',
          summary:
            'Receiving team: 30-yard line, or 5 yards from the previous spot and re-kick, or 5 yards from where it went OOB (league options)',
        },
        from: 'choice',
        downEffect: 'none',
        halfDistanceToGoal: false,
        canDisqualify: false,
        typicallyDeadBall: true,
        notes: 'Not a simple 5-yard walk-off from the previous spot. Receiving team chooses among book options.',
      },
      nfl: {
        applies: true,
        yardage: {
          kind: 'options',
          summary: 'Receiving team possession at a set yard line (kickoff OOB spot has changed with recent kickoff rules — confirm current NFL book)',
        },
        from: 'choice',
        downEffect: 'none',
        halfDistanceToGoal: false,
        canDisqualify: false,
        typicallyDeadBall: true,
        notes: 'NFL kickoff OOB enforcement follows the current kickoff table, not NCAA’s 30-yard option.',
      },
      cfl: {
        applies: true,
        yardage: {
          kind: 'options',
          summary: 'Receiving team typically takes the ball at its 40 (or equivalent option) — confirm current CFL book',
        },
        from: 'choice',
        downEffect: 'none',
        halfDistanceToGoal: false,
        canDisqualify: false,
        typicallyDeadBall: true,
      },
    },
  }),
  flag({
    id: 'flag.illegal_touching_free_kick',
    label: 'Illegal touching of free kick',
    description: 'Kicking team touches a free kick before it goes 10 yards / is touched.',
    category: 'kick',
    against: 'kicking',
    series: ['free_kick'],
    associations: {
      ncaa: {
        applies: true,
        yardage: { kind: 'options', summary: 'Re-kick or awarded possession options for the receiving team' },
        from: 'choice',
        downEffect: 'none',
        halfDistanceToGoal: false,
        canDisqualify: false,
        typicallyDeadBall: false,
      },
      nfl: {
        applies: true,
        yardage: { kind: 'options', summary: 'Receiving team options per current kickoff rules' },
        from: 'choice',
        downEffect: 'none',
        halfDistanceToGoal: false,
        canDisqualify: false,
        typicallyDeadBall: false,
      },
      cfl: {
        applies: true,
        yardage: { kind: 'options', summary: 'Receiving team options' },
        from: 'choice',
        downEffect: 'none',
        halfDistanceToGoal: false,
        canDisqualify: false,
        typicallyDeadBall: false,
      },
    },
  }),
  flag({
    id: 'flag.free_kick_offside',
    label: 'Offside on free kick',
    description: 'Kicking or receiving team offside on a kickoff / free kick.',
    category: 'kick',
    against: 'either',
    series: ['free_kick'],
    associations: {
      ncaa: fixed(5, { ...LIVE_5_REPLAY, typicallyDeadBall: false, downEffect: 'varies' }),
      nfl: fixed(5, { ...LIVE_5_REPLAY, typicallyDeadBall: false, downEffect: 'varies' }),
      cfl: fixed(5, { ...LIVE_5_REPLAY, typicallyDeadBall: false, downEffect: 'varies' }),
    },
  }),
  flag({
    id: 'flag.illegal_wedge',
    label: 'Illegal wedge',
    description: 'Illegal three-man (or more) wedge on a kick return.',
    category: 'kick',
    against: 'receiving',
    series: ['free_kick'],
    associations: {
      ncaa: fixed(15, { ...PF_15_OFFENSE, notes: 'Charged to the receiving team.' }),
      nfl: fixed(15, { ...PF_15_OFFENSE, notes: 'Charged to the receiving team.' }),
      cfl: absent('Not a separately named CFL foul in this catalog.'),
    },
  }),
  flag({
    id: 'flag.illegal_fair_catch',
    label: 'Invalid / illegal fair catch',
    description: 'Illegal fair-catch signal or advancing after a fair catch.',
    category: 'kick',
    against: 'receiving',
    series: KICK,
    associations: {
      ncaa: fixed(5, { ...LIVE_5_REPLAY, typicallyDeadBall: false, downEffect: 'none' }),
      nfl: fixed(5, { ...LIVE_5_REPLAY, typicallyDeadBall: false, downEffect: 'none' }),
      cfl: absent('CFL has no fair catch.'),
    },
  }),

  // —— Other ——
  flag({
    id: 'flag.illegal_batting',
    label: 'Illegal batting / kicking the ball',
    description: 'Intentionally batting a loose ball in a prohibited way.',
    category: 'other',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(10, {
        from: 'spot_of_foul',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      nfl: fixed(10, {
        from: 'spot_of_foul',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
      cfl: fixed(10, {
        from: 'spot_of_foul',
        downEffect: 'varies',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: false,
      }),
    },
  }),
  flag({
    id: 'flag.leverage',
    label: 'Leverage / jumping on a teammate',
    description: 'Using a teammate to gain height at the line (goal-line / kicks).',
    category: 'other',
    against: 'defense',
    series: TRY_AND_SCRIMMAGE,
    associations: {
      ncaa: fixed(15, { ...PF_15_DEFENSE }),
      nfl: fixed(15, { ...PF_15_DEFENSE }),
      cfl: absent('Typically illegal interference / rough play.'),
    },
  }),
  flag({
    id: 'flag.palpably_unfair_act',
    label: 'Palpably unfair act',
    description: 'Extraordinary unfair act; officials may award a score / eject.',
    category: 'other',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: {
        applies: true,
        yardage: { kind: 'varies', summary: 'Referee may award yardage, a score, and/or disqualify' },
        from: 'varies',
        downEffect: 'varies',
        halfDistanceToGoal: false,
        canDisqualify: true,
        typicallyDeadBall: true,
      },
      nfl: {
        applies: true,
        yardage: { kind: 'varies', summary: 'Referee may award yardage, a score, and/or disqualify' },
        from: 'varies',
        downEffect: 'varies',
        halfDistanceToGoal: false,
        canDisqualify: true,
        typicallyDeadBall: true,
      },
      cfl: {
        applies: true,
        yardage: { kind: 'varies', summary: 'Referee may award yardage, a score, and/or disqualify' },
        from: 'varies',
        downEffect: 'varies',
        halfDistanceToGoal: false,
        canDisqualify: true,
        typicallyDeadBall: true,
      },
    },
  }),
  flag({
    id: 'flag.illegal_equipment',
    label: 'Illegal equipment / uniform',
    description: 'Hazardous or illegal equipment; player must leave until corrected.',
    category: 'other',
    against: 'either',
    series: ALL_SERIES,
    associations: {
      ncaa: fixed(5, {
        ...DEAD_5_REPLAY,
        notes: 'Often enforced as delay / player must leave; not always a yardage foul.',
      }),
      nfl: fixed(5, {
        ...DEAD_5_REPLAY,
        notes: 'Often enforced as delay / player must leave; not always a yardage foul.',
      }),
      cfl: fixed(10, {
        from: 'previous',
        downEffect: 'replay',
        halfDistanceToGoal: true,
        canDisqualify: false,
        typicallyDeadBall: true,
        notes: 'May be objectionable / delay rather than a fixed 10.',
      }),
    },
  }),
]

const FLAG_BY_ID: ReadonlyMap<FlagTypeId, FlagType> = new Map(
  FLAG_TYPES.map((entry) => [entry.id, entry]),
)

export function isFlagTypeId(value: string): value is FlagTypeId {
  return FLAG_BY_ID.has(value as FlagTypeId)
}

export function getFlagType(id: FlagTypeId): FlagType | undefined {
  return FLAG_BY_ID.get(id)
}

export function flagAppliesToAssociation(
  type: FlagType,
  code: FootballCode,
): boolean {
  return type.associations[code].applies === true
}

export function getAssociationFlagRule(
  type: FlagType,
  code: FootballCode,
): AssociationFlagRule | null {
  const entry = type.associations[code]
  return entry.applies ? entry : null
}

export function getAssociationFlagRuleById(
  id: FlagTypeId,
  code: FootballCode,
): AssociationFlagRule | null {
  const type = getFlagType(id)
  return type ? getAssociationFlagRule(type, code) : null
}

/** Flag types that exist under this association (omit NCAA-only from CFL, etc.). */
export function flagTypesForAssociation(code: FootballCode): FlagType[] {
  return FLAG_TYPES.filter((type) => flagAppliesToAssociation(type, code))
}

export function flagTypesForGame(game: {
  rulesetId: FootballCode
}): FlagType[] {
  return flagTypesForAssociation(game.rulesetId)
}

export function flagTypesForSeries(
  code: FootballCode,
  seriesKind: SeriesKind,
): FlagType[] {
  return flagTypesForAssociation(code).filter((type) =>
    type.series.includes(seriesKind),
  )
}

export function summarizeYardage(spec: YardageSpec): string {
  switch (spec.kind) {
    case 'fixed':
      return `${spec.yards} yards`
    case 'spot_foul':
      return 'Spot of the foul'
    case 'spot_foul_end_zone':
      return `Spot of the foul (end zone → ${spec.ballOn})`
    case 'options':
    case 'varies':
      return spec.summary
  }
}
