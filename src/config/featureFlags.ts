import type { RiskType } from '@/types'

export const FEATURE_FLAG_GROUPS = [
  'Game Console',
  'Header',
  'Scoreboard',
  'Risk Management',
  'Settings',
] as const

export type FeatureFlagGroup = (typeof FEATURE_FLAG_GROUPS)[number]

export interface FeatureFlagDefinition {
  id: string
  label: string
  description?: string
  group: FeatureFlagGroup
  /** When set, this flag only applies if the parent is also enabled. */
  parent?: string
  defaultEnabled: boolean
}

export const FEATURE_FLAGS = [
  {
    id: 'game.scoreboard',
    label: 'Scoreboard panel',
    description: 'Clock, down/distance, and possession controls.',
    group: 'Game Console',
    defaultEnabled: true,
  },
  {
    id: 'game.playByPlay',
    label: 'Play-by-play panel',
    description: 'Live feed of simulated and recorded plays.',
    group: 'Game Console',
    defaultEnabled: true,
  },
  {
    id: 'game.riskManagement',
    label: 'Risk management panel',
    description: 'Operator risk flag toggles.',
    group: 'Game Console',
    defaultEnabled: true,
  },
  {
    id: 'game.fieldDirectionDialog',
    label: 'Field direction dialog',
    description: 'Prompt on first open to set attacking direction.',
    group: 'Game Console',
    defaultEnabled: true,
  },
  {
    id: 'header.connectionStatus',
    label: 'Connection status chip',
    description: 'Online indicator beside the back button.',
    group: 'Header',
    defaultEnabled: true,
  },
  {
    id: 'header.takeControl',
    label: 'Take Control button',
    description: 'Manual override mode for the game console.',
    group: 'Header',
    defaultEnabled: true,
  },
  {
    id: 'header.settings',
    label: 'Settings dialog',
    description: 'Gear icon for field, log, and feature settings.',
    group: 'Header',
    defaultEnabled: true,
  },
  {
    id: 'scoreboard.quarterStatus',
    label: 'Quarter status colors',
    description: 'Green / yellow / red background on the QTR cell.',
    group: 'Scoreboard',
    parent: 'game.scoreboard',
    defaultEnabled: true,
  },
  {
    id: 'scoreboard.clockAdjust',
    label: 'Clock adjust buttons',
    description: 'Plus and minus controls beside the game clock.',
    group: 'Scoreboard',
    parent: 'game.scoreboard',
    defaultEnabled: true,
  },
  {
    id: 'scoreboard.possessionSwitch',
    label: 'Possession switch',
    description: 'Home / away possession selector.',
    group: 'Scoreboard',
    parent: 'game.scoreboard',
    defaultEnabled: true,
  },
  {
    id: 'risk.challengeReview',
    label: 'Challenge / Review',
    group: 'Risk Management',
    parent: 'game.riskManagement',
    defaultEnabled: true,
  },
  {
    id: 'risk.statDelay',
    label: 'Unreliable',
    group: 'Risk Management',
    parent: 'game.riskManagement',
    defaultEnabled: true,
  },
  {
    id: 'risk.bigPlay',
    label: 'Big Play',
    group: 'Risk Management',
    parent: 'game.riskManagement',
    defaultEnabled: true,
  },
  {
    id: 'risk.penalty',
    label: 'Penalty',
    group: 'Risk Management',
    parent: 'game.riskManagement',
    defaultEnabled: true,
  },
  {
    id: 'risk.touchdown',
    label: 'Touchdown',
    group: 'Risk Management',
    parent: 'game.riskManagement',
    defaultEnabled: true,
  },
  {
    id: 'risk.playAboutToStart',
    label: 'Play About to Start',
    group: 'Risk Management',
    parent: 'game.riskManagement',
    defaultEnabled: true,
  },
  {
    id: 'settings.fieldDirection',
    label: 'Field direction tab',
    group: 'Settings',
    parent: 'header.settings',
    defaultEnabled: true,
  },
  {
    id: 'settings.actionLog',
    label: 'Action log tab',
    group: 'Settings',
    parent: 'header.settings',
    defaultEnabled: true,
  },
  {
    id: 'settings.csvExport',
    label: 'CSV export',
    description: 'Download action log as CSV from the log tab.',
    group: 'Settings',
    parent: 'settings.actionLog',
    defaultEnabled: true,
  },
] as const satisfies readonly FeatureFlagDefinition[]

export type FeatureFlagId = (typeof FEATURE_FLAGS)[number]['id']

export const FEATURE_FLAG_BY_ID = Object.fromEntries(
  FEATURE_FLAGS.map((flag) => [flag.id, flag]),
) as Record<FeatureFlagId, FeatureFlagDefinition>

export const DEFAULT_FEATURE_FLAGS = Object.fromEntries(
  FEATURE_FLAGS.map((flag) => [flag.id, flag.defaultEnabled]),
) as Record<FeatureFlagId, boolean>

export const RISK_FEATURE_FLAGS: Record<RiskType, FeatureFlagId> = {
  challengeReview: 'risk.challengeReview',
  statDelay: 'risk.statDelay',
  bigPlay: 'risk.bigPlay',
  penalty: 'risk.penalty',
  touchdown: 'risk.touchdown',
  playAboutToStart: 'risk.playAboutToStart',
}

export function isFeatureEnabled(
  flags: Partial<Record<FeatureFlagId, boolean>>,
  id: FeatureFlagId,
): boolean {
  const definition = FEATURE_FLAG_BY_ID[id]
  const enabled = flags[id] ?? definition.defaultEnabled

  if (!enabled) return false
  if (!definition.parent) return true

  return isFeatureEnabled(flags, definition.parent as FeatureFlagId)
}
