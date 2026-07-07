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
