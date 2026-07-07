import { isPast, parse } from 'date-fns'
import type { Fixture } from '@/types'

export function getFixtureKickoff(fixture: Fixture): Date {
  return parse(
    `${fixture.startDate} ${fixture.startTime}`,
    'yyyy-MM-dd HH:mm',
    new Date(),
  )
}

export function isFixtureScheduled(fixture: Fixture): boolean {
  return !isPast(getFixtureKickoff(fixture))
}

/** Furthest-ahead kickoffs first, earliest dates last. */
export function sortFixturesByKickoffDesc(fixtures: Fixture[]): Fixture[] {
  return [...fixtures].sort(
    (a, b) => getFixtureKickoff(b).getTime() - getFixtureKickoff(a).getTime(),
  )
}
