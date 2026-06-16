import { formatClock } from '@/lib/format'
import type { RiskType } from '@/types'
import type { UserAction, UserActionType } from '@/types/actions'

const RISK_LABELS: Record<RiskType, string> = {
  challengeReview: 'Challenge / Review',
  statDelay: 'Unreliable',
  bigPlay: 'Big Play',
  penalty: 'Penalty',
  touchdown: 'Touchdown',
}

export function createUserAction<T extends UserActionType>(
  fixtureId: string,
  action: {
    type: T
    payload: Extract<UserAction, { type: T }>['payload']
  },
  clock: { seconds: number; period: number },
): UserAction {
  return {
    id: crypto.randomUUID(),
    fixtureId,
    timestamp: new Date().toISOString(),
    clockSeconds: clock.seconds,
    clockPeriod: clock.period,
    type: action.type,
    payload: action.payload,
  } as UserAction
}

export function appendAction(
  logs: Record<string, UserAction[]>,
  action: UserAction,
): Record<string, UserAction[]> {
  const existing = logs[action.fixtureId] ?? []
  return {
    ...logs,
    [action.fixtureId]: [...existing, action],
  }
}

export function formatActionTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatActionGameClock(action: UserAction): string {
  return `Q${action.clockPeriod} · ${formatClock(action.clockSeconds)}`
}

export function formatActionLabel(action: UserAction): string {
  switch (action.type) {
    case 'take_control':
      return action.payload.active ? 'Take Control enabled' : 'Take Control stopped'
    case 'risk_toggle': {
      const label = RISK_LABELS[action.payload.risk]
      return action.payload.active
        ? `${label} flagged`
        : `${label} cleared`
    }
    case 'clock_toggle':
      return action.payload.running
        ? `Clock started (${formatClock(action.payload.seconds)})`
        : `Clock paused (${formatClock(action.payload.seconds)})`
    case 'clock_adjust': {
      const direction = action.payload.delta > 0 ? 'increased' : 'decreased'
      return `Clock ${direction} by ${Math.abs(action.payload.delta)}s → ${formatClock(action.payload.seconds)}`
    }
    case 'quarter_start':
      return `Quarter ${action.payload.toPeriod} started (${formatClock(action.payload.seconds)})`
    case 'possession_toggle':
      return `Possession → ${action.payload.teamAbbr}`
  }
}

export function formatActionType(action: UserAction): string {
  switch (action.type) {
    case 'take_control':
      return 'Take Control'
    case 'risk_toggle':
      return 'Risk'
    case 'clock_toggle':
      return 'Clock'
    case 'clock_adjust':
      return 'Clock Adjust'
    case 'quarter_start':
      return 'Quarter Start'
    case 'possession_toggle':
      return 'Possession'
  }
}

function escapeCsvValue(value: string | number | boolean): string {
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function actionsToCsv(actions: UserAction[]): string {
  const headers = [
    'id',
    'fixture_id',
    'timestamp',
    'quarter',
    'game_clock',
    'clock_seconds',
    'type',
    'description',
    'payload',
  ]

  const rows = actions.map((action) => [
    action.id,
    action.fixtureId,
    action.timestamp,
    action.clockPeriod,
    formatClock(action.clockSeconds),
    action.clockSeconds,
    action.type,
    formatActionLabel(action),
    JSON.stringify(action.payload),
  ])

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n')
}

export function downloadActionLogCsv(
  actions: UserAction[],
  fixtureId: string,
): void {
  if (actions.length === 0) return

  const csv = actionsToCsv(actions)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)

  link.href = url
  link.download = `action-log-${fixtureId}-${date}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
