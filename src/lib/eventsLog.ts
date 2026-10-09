/**
 * Session events log CSV — collected datapoints in the operator export schema.
 * mins/seconds are wall-clock elapsed from the first event (not game clock).
 */

import type { CollectedDatapoint } from '@/types'

const CSV_HEADERS = [
  'mins',
  'seconds',
  'datapoint',
  'ball on',
  'period',
  'drive',
  'play',
  'down',
  'to go',
] as const

/** Short export names matching the events-log schema. */
const DATAPOINT_EXPORT_NAMES: Record<string, string> = {
  kickoff: 'kicked',
  return: 'return',
  touchback: 'touchback',
  fair_catch: 'fair catch',
  kick_out_of_bounds: 'out of bounds',
  muff: 'muff',
  tackle: 'tackle',
  return_out_of_bounds: 'out of bounds',
  return_fumble: 'fumble',
  return_touchdown: 'touchdown',
  recovery_receiving: 'recovery receiving',
  recovery_kicking: 'recovery kicking',
  recovery_offense: 'recovery offense',
  recovery_defense: 'recovery defense',
  rush: 'rush',
  throw: 'pass',
  punt: 'punt',
  catch: 'complete pass',
  incomplete: 'incomplete',
  out_of_bounds: 'out of bounds',
  play_out_of_bounds: 'out of bounds',
  interception: 'interception',
  play_fumble: 'fumble',
  touchdown: 'touchdown',
  snap: 'snap',
  end_play: 'next play',
  yards: 'yards',
  try: 'try',
  pat_kick: '1-pt kick',
  two_point: '2-pt play',
  pat_good: 'pat good',
  pat_no_good: 'pat no good',
  two_point_good: '2-pt good',
  two_point_no_good: '2-pt no good',
  defensive_two_point: 'defense scores',
  undo: 'undo',
  flag: 'flag',
  flag_accept: 'flag accepted',
  flag_decline: 'flag declined',
}

function escapeCsvValue(value: string | number): string {
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  return escapeCsvValue(value)
}

export function exportDatapointName(entry: CollectedDatapoint): string {
  if (DATAPOINT_EXPORT_NAMES[entry.key]) {
    return DATAPOINT_EXPORT_NAMES[entry.key]
  }
  if (entry.key.startsWith('risk.')) {
    return entry.label.toLowerCase()
  }
  if (entry.key.startsWith('flag.')) {
    return entry.label.replace(/\s*-\s*[A-Z]{2,4}\s*$/, '').toLowerCase()
  }
  return entry.label
    .replace(/\s*-\s*[A-Z]{2,4}\s*$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
}

/** Wall-clock minutes + seconds since the first datapoint. */
export function wallElapsedParts(
  collectedAt: number,
  sessionStartedAt: number,
): { mins: number; seconds: number } {
  const elapsedMs = Math.max(0, collectedAt - sessionStartedAt)
  const totalSeconds = Math.floor(elapsedMs / 1000)
  return {
    mins: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  }
}

export function datapointsToEventsCsv(datapoints: CollectedDatapoint[]): string {
  if (datapoints.length === 0) {
    return CSV_HEADERS.join(',')
  }

  const sessionStartedAt = datapoints[0]!.collectedAt
  const rows = datapoints.map((entry) => {
    const { mins, seconds } = wallElapsedParts(
      entry.collectedAt,
      sessionStartedAt,
    )
    return [
      cell(mins),
      cell(seconds),
      cell(exportDatapointName(entry)),
      cell(entry.ballOn),
      cell(entry.period),
      cell(entry.drive),
      cell(entry.play),
      cell(entry.down),
      cell(entry.toGo),
    ].join(',')
  })

  return [CSV_HEADERS.join(','), ...rows].join('\n')
}

export function downloadEventsLogCsv(
  datapoints: CollectedDatapoint[],
  fixtureId: string,
): void {
  if (datapoints.length === 0) return

  const csv = datapointsToEventsCsv(datapoints)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)

  link.href = url
  link.download = `events-log-${fixtureId}-${date}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
