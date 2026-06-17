import type { RiskType } from '@/types'

export type UserActionType =
  | 'take_control'
  | 'risk_toggle'
  | 'clock_toggle'
  | 'clock_adjust'
  | 'quarter_start'
  | 'possession_toggle'
  | 'field_direction_set'

interface UserActionBase {
  id: string
  fixtureId: string
  timestamp: string
  clockSeconds: number
  clockPeriod: number
  type: UserActionType
}

export type TakeControlAction = UserActionBase & {
  type: 'take_control'
  payload: {
    active: boolean
  }
}

export type RiskToggleAction = UserActionBase & {
  type: 'risk_toggle'
  payload: {
    risk: RiskType
    active: boolean
  }
}

export type ClockToggleAction = UserActionBase & {
  type: 'clock_toggle'
  payload: {
    running: boolean
    seconds: number
  }
}

export type ClockAdjustAction = UserActionBase & {
  type: 'clock_adjust'
  payload: {
    delta: number
    seconds: number
  }
}

export type QuarterStartAction = UserActionBase & {
  type: 'quarter_start'
  payload: {
    fromPeriod: number
    toPeriod: number
    seconds: number
  }
}

export type PossessionToggleAction = UserActionBase & {
  type: 'possession_toggle'
  payload: {
    possessionIsHome: boolean
    teamAbbr: string
  }
}

export type FieldDirectionSetAction = UserActionBase & {
  type: 'field_direction_set'
  payload: {
    homeAttacksRight: boolean
    homeAbbr: string
  }
}

export type UserAction =
  | TakeControlAction
  | RiskToggleAction
  | ClockToggleAction
  | ClockAdjustAction
  | QuarterStartAction
  | PossessionToggleAction
  | FieldDirectionSetAction

export type UserActionPayload<T extends UserActionType> = Extract<
  UserAction,
  { type: T }
>['payload']

export type ActionLog = UserAction[]

export type ActionLogsByFixture = Record<string, ActionLog>
