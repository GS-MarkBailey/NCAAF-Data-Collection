import type { CatalogEntryBase, LeagueSet } from './types'

export type PenaltyYardage =
  | 5
  | 10
  | 15
  | 'spot'
  | 'half_distance'
  | 'loss_of_down'
  | 'disqualification'
  | 'varies'

export interface PenaltyDef extends CatalogEntryBase {
  category:
    | 'pre_snap'
    | 'line'
    | 'pass'
    | 'personal'
    | 'unsportsmanlike'
    | 'kick'
    | 'substitution'
    | 'clock'
    | 'other'
  /** Typical enforcement distance / type (spot fouls noted). */
  yardage: PenaltyYardage
  /** Often awarded automatic first down when accepted. */
  automaticFirstDown?: boolean
  /** May include ejection / targeting disqualification. */
  canDisqualify?: boolean
}

function p(
  partial: Omit<PenaltyDef, 'leagues'> & { leagues?: LeagueSet },
): PenaltyDef {
  return { leagues: 'all', ...partial }
}

/**
 * Operator-facing penalty catalog across NCAA, NFL, and CFL.
 *
 * Yardage and enforcement are *typical* — official books win on edge cases
 * (spot vs previous-line, half-distance-to-goal, decline options, etc.).
 */
export const PENALTIES: readonly PenaltyDef[] = [
  // —— Pre-snap / procedure ——
  p({
    id: 'penalty.false_start',
    label: 'False start',
    description: 'Offense moves illegally before the snap.',
    category: 'pre_snap',
    yardage: 5,
    leagues: ['ncaa', 'nfl'],
    notes: 'CFL often groups similar fouls under illegal procedure.',
  }),
  p({
    id: 'penalty.illegal_procedure',
    label: 'Illegal procedure',
    description: 'CFL umbrella for many pre-snap / formation procedure fouls.',
    category: 'pre_snap',
    yardage: 5,
    leagues: ['cfl'],
  }),
  p({
    id: 'penalty.encroachment',
    label: 'Encroachment',
    description: 'Defender enters the neutral zone and contacts an opponent before the snap.',
    category: 'pre_snap',
    yardage: 5,
    leagues: ['ncaa', 'nfl'],
  }),
  p({
    id: 'penalty.offside',
    label: 'Offside',
    description: 'Player lined up in / beyond the neutral zone at the snap.',
    category: 'pre_snap',
    yardage: 5,
  }),
  p({
    id: 'penalty.neutral_zone_infraction',
    label: 'Neutral zone infraction',
    description: 'Defender causes an offensive player to react in the neutral zone (NFL).',
    category: 'pre_snap',
    yardage: 5,
    leagues: ['nfl'],
  }),
  p({
    id: 'penalty.delay_of_game',
    label: 'Delay of game',
    description: 'Failure to put the ball in play before the play clock expires.',
    category: 'clock',
    yardage: 5,
    notes: 'CFL also uses time-count variants (5 / 10).',
  }),
  p({
    id: 'penalty.time_count',
    label: 'Time count',
    description: 'CFL play-clock / time-count foul.',
    category: 'clock',
    yardage: 5,
    leagues: ['cfl'],
    notes: 'Can be 10 yards in the last 3 minutes in some cases.',
  }),
  p({
    id: 'penalty.illegal_formation',
    label: 'Illegal formation',
    description: 'Fewer than required players on the line, covered receivers, etc.',
    category: 'pre_snap',
    yardage: 5,
  }),
  p({
    id: 'penalty.illegal_motion',
    label: 'Illegal motion',
    description: 'Player in motion moving illegally toward the line at the snap.',
    category: 'pre_snap',
    yardage: 5,
  }),
  p({
    id: 'penalty.illegal_shift',
    label: 'Illegal shift',
    description: 'Team fails to reset for one second after a shift.',
    category: 'pre_snap',
    yardage: 5,
    leagues: ['ncaa', 'nfl'],
  }),
  p({
    id: 'penalty.illegal_snap',
    label: 'Illegal snap',
    description: 'Snapper lifts the ball or fails to snap legally.',
    category: 'pre_snap',
    yardage: 5,
  }),

  // —— Line / blocking ——
  p({
    id: 'penalty.offensive_holding',
    label: 'Offensive holding',
    description: 'Illegal grab / restrict by an offensive player.',
    category: 'line',
    yardage: 10,
  }),
  p({
    id: 'penalty.defensive_holding',
    label: 'Defensive holding',
    description: 'Illegal hold by a defender, often in pass coverage.',
    category: 'pass',
    yardage: 5,
    automaticFirstDown: true,
    leagues: ['ncaa', 'nfl'],
    notes: 'CFL holding / illegal contact distances differ (often 10).',
  }),
  p({
    id: 'penalty.illegal_block_in_back',
    label: 'Illegal block in the back',
    description: 'Block into the back of an opponent beyond legal exceptions.',
    category: 'line',
    yardage: 10,
  }),
  p({
    id: 'penalty.clipping',
    label: 'Clipping',
    description: 'Block below the waist from behind.',
    category: 'personal',
    yardage: 15,
  }),
  p({
    id: 'penalty.chop_block',
    label: 'Chop block',
    description: 'High-low combination block on the same defender.',
    category: 'personal',
    yardage: 15,
  }),
  p({
    id: 'penalty.crackback',
    label: 'Crackback block',
    description: 'Illegal crackback / peel-back style block.',
    category: 'personal',
    yardage: 15,
  }),
  p({
    id: 'penalty.tripping',
    label: 'Tripping',
    description: 'Using the leg to trip an opponent.',
    category: 'personal',
    yardage: 10,
  }),
  p({
    id: 'penalty.helping_runner',
    label: 'Helping the runner',
    description: 'Teammate pushes / pulls the ball carrier illegally.',
    category: 'line',
    yardage: 5,
    leagues: ['ncaa', 'nfl'],
  }),
  p({
    id: 'penalty.illegal_hands_to_face',
    label: 'Hands to the face',
    description: 'Open / closed hand to the facemask / face (non-facemask foul variant).',
    category: 'personal',
    yardage: 10,
    leagues: ['ncaa', 'nfl'],
  }),

  // —— Pass game ——
  p({
    id: 'penalty.defensive_pass_interference',
    label: 'Defensive pass interference',
    description: 'Illegal contact that hinders an eligible receiver’s opportunity to catch a forward pass.',
    category: 'pass',
    yardage: 'spot',
    automaticFirstDown: true,
    notes:
      'NFL/NCAA: typically spot foul (with half-distance limits). CFL: commonly 10 yards from previous spot — not a full spot foul.',
  }),
  p({
    id: 'penalty.offensive_pass_interference',
    label: 'Offensive pass interference',
    description: 'Illegal contact by an eligible receiver / teammate on a forward pass play.',
    category: 'pass',
    yardage: 10,
  }),
  p({
    id: 'penalty.illegal_contact',
    label: 'Illegal contact',
    description: 'Defender contacts a receiver beyond 5 yards downfield (NFL).',
    category: 'pass',
    yardage: 5,
    automaticFirstDown: true,
    leagues: ['nfl'],
  }),
  p({
    id: 'penalty.ineligible_downfield',
    label: 'Ineligible receiver downfield',
    description: 'Lineman illegally downfield on a forward pass.',
    category: 'pass',
    yardage: 5,
  }),
  p({
    id: 'penalty.illegal_forward_pass',
    label: 'Illegal forward pass',
    description: 'Second forward pass, pass beyond LOS, or pass after ball crossed LOS.',
    category: 'pass',
    yardage: 5,
    notes: 'Often also loss of down.',
  }),
  p({
    id: 'penalty.intentional_grounding',
    label: 'Intentional grounding',
    description: 'Passer throws the ball away to avoid a sack without an eligible receiver in the area.',
    category: 'pass',
    yardage: 'spot',
    notes: 'Spot of foul + loss of down; safety if in end zone.',
  }),
  p({
    id: 'penalty.illegal_touching',
    label: 'Illegal touching',
    description: 'Ineligible offensive player touches a forward pass.',
    category: 'pass',
    yardage: 5,
  }),

  // —— Personal fouls / safety ——
  p({
    id: 'penalty.unnecessary_roughness',
    label: 'Unnecessary roughness',
    description: 'Late / excessive contact beyond the play.',
    category: 'personal',
    yardage: 15,
    automaticFirstDown: true,
    canDisqualify: true,
  }),
  p({
    id: 'penalty.personal_foul',
    label: 'Personal foul',
    description: 'Generic personal-foul bucket when a more specific code is unavailable.',
    category: 'personal',
    yardage: 15,
    automaticFirstDown: true,
    canDisqualify: true,
  }),
  p({
    id: 'penalty.facemask',
    label: 'Face mask',
    description: 'Grasping / twisting the face mask.',
    category: 'personal',
    yardage: 15,
    automaticFirstDown: true,
  }),
  p({
    id: 'penalty.horse_collar',
    label: 'Horse-collar tackle',
    description: 'Tackler grabs inside the shoulder pads / jersey collar from behind and pulls down.',
    category: 'personal',
    yardage: 15,
    automaticFirstDown: true,
    leagues: ['ncaa', 'nfl'],
  }),
  p({
    id: 'penalty.roughing_passer',
    label: 'Roughing the passer',
    description: 'Illegal hit on the quarterback after / during the throw.',
    category: 'personal',
    yardage: 15,
    automaticFirstDown: true,
  }),
  p({
    id: 'penalty.roughing_kicker',
    label: 'Roughing the kicker / holder',
    description: 'Illegal contact with the kicker or holder.',
    category: 'kick',
    yardage: 15,
    automaticFirstDown: true,
  }),
  p({
    id: 'penalty.running_into_kicker',
    label: 'Running into the kicker',
    description: 'Lesser contact with the kicker (not roughing).',
    category: 'kick',
    yardage: 5,
    leagues: ['ncaa', 'nfl'],
  }),
  p({
    id: 'penalty.spearing',
    label: 'Spearing / crown-of-helmet',
    description: 'Initiating contact with the crown of the helmet.',
    category: 'personal',
    yardage: 15,
    canDisqualify: true,
  }),
  p({
    id: 'penalty.targeting',
    label: 'Targeting',
    description:
      'NCAA: targeting the head/neck with the helmet / forearm / shoulder — often ejection + replay review.',
    category: 'personal',
    yardage: 15,
    leagues: ['ncaa'],
    canDisqualify: true,
    automaticFirstDown: true,
  }),
  p({
    id: 'penalty.blindside_block',
    label: 'Blindside block',
    description: 'Illegal blindside force block (force-into-head/neck variants by league).',
    category: 'personal',
    yardage: 15,
  }),
  p({
    id: 'penalty.low_block',
    label: 'Blocking below the waist / cut block',
    description: 'Illegal low block outside allowed zones.',
    category: 'personal',
    yardage: 15,
  }),
  p({
    id: 'penalty.late_hit',
    label: 'Late hit',
    description: 'Contact after the ball is dead / out of play.',
    category: 'personal',
    yardage: 15,
    automaticFirstDown: true,
  }),
  p({
    id: 'penalty.piling_on',
    label: 'Piling on',
    description: 'Driving into a player already down.',
    category: 'personal',
    yardage: 15,
  }),

  // —— Unsportsmanlike / conduct ——
  p({
    id: 'penalty.unsportsmanlike',
    label: 'Unsportsmanlike conduct',
    description: 'Taunting, celebrating excessively, abusive language, etc.',
    category: 'unsportsmanlike',
    yardage: 15,
    canDisqualify: true,
  }),
  p({
    id: 'penalty.taunting',
    label: 'Taunting',
    description: 'Directed taunt at an opponent.',
    category: 'unsportsmanlike',
    yardage: 15,
  }),
  p({
    id: 'penalty.objectionable_conduct',
    label: 'Objectionable conduct',
    description: 'CFL conduct foul analogous to unsportsmanlike.',
    category: 'unsportsmanlike',
    yardage: 10,
    leagues: ['cfl'],
  }),
  p({
    id: 'penalty.illegal_participation',
    label: 'Illegal participation',
    description: 'Too many players, player off sideline participates, etc.',
    category: 'substitution',
    yardage: 15,
    leagues: ['ncaa', 'nfl'],
    notes: 'CFL lists related fouls under too many players / illegal participation (10).',
  }),
  p({
    id: 'penalty.too_many_men',
    label: 'Too many men on the field',
    description: 'More than the allowed number of players at the snap.',
    category: 'substitution',
    yardage: 5,
  }),
  p({
    id: 'penalty.illegal_substitution',
    label: 'Illegal substitution',
    description: 'Substitution after the ready / during the play illegally.',
    category: 'substitution',
    yardage: 5,
  }),

  // —— Kicking ——
  p({
    id: 'penalty.fair_catch_interference',
    label: 'Fair catch interference',
    description: 'Contact with a receiver who has signaled fair catch.',
    category: 'kick',
    yardage: 15,
    leagues: ['ncaa', 'nfl'],
  }),
  p({
    id: 'penalty.kick_catch_interference',
    label: 'Kick-catch interference',
    description: 'Interference with a player attempting to catch a scrimmage kick.',
    category: 'kick',
    yardage: 15,
    leagues: ['ncaa', 'nfl'],
  }),
  p({
    id: 'penalty.no_yards',
    label: 'No yards',
    description: 'CFL: offside kicking player within 5 yards of a receiver fielding a kick.',
    category: 'kick',
    yardage: 'varies',
    leagues: ['cfl'],
    notes: 'Typically 5 or 15 yards depending on contact / ball state.',
  }),
  p({
    id: 'penalty.illegally_downfield_on_kick',
    label: 'Illegally downfield on kick',
    description: 'Player illegally beyond the line on a scrimmage kick.',
    category: 'kick',
    yardage: 5,
  }),
  p({
    id: 'penalty.kickoff_out_of_bounds',
    label: 'Kickoff out of bounds',
    description: 'Free kick goes out of bounds without being touched.',
    category: 'kick',
    yardage: 5,
    notes: 'Receiving team may also have re-kick / spot options by league.',
  }),

  // —— Other ——
  p({
    id: 'penalty.illegal_batting',
    label: 'Illegal batting / kicking ball',
    description: 'Intentionally batting a loose ball in a prohibited way.',
    category: 'other',
    yardage: 10,
  }),
  p({
    id: 'penalty.illegal_use_of_hands',
    label: 'Illegal use of hands',
    description: 'Hands to the neck / head or other illegal hand use.',
    category: 'line',
    yardage: 10,
  }),
  p({
    id: 'penalty.leverage',
    label: 'Leverage / jumping on teammate',
    description: 'Using a teammate to gain height at the line (goal-line / kicks).',
    category: 'other',
    yardage: 15,
    leagues: ['ncaa', 'nfl'],
  }),
  p({
    id: 'penalty.palpably_unfair_act',
    label: 'Palpably unfair act',
    description: 'Extraordinary unfair act; officials may award score / eject.',
    category: 'other',
    yardage: 'varies',
    canDisqualify: true,
  }),
  p({
    id: 'penalty.unsportsmanlike_equipment',
    label: 'Illegal equipment / uniform',
    description: 'Hazardous or illegal equipment; player must leave until corrected.',
    category: 'other',
    yardage: 5,
    notes: 'Often enforced as delay / removal rather than yardage alone.',
  }),
]

export type PenaltyId = (typeof PENALTIES)[number]['id']
