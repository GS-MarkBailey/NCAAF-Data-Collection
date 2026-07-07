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

function getFixtureSearchValues(fixture: Fixture): string[] {
  return [
    fixture.homeTeam,
    fixture.awayTeam,
    fixture.homeAbbr,
    fixture.awayAbbr,
    fixture.id,
    fixture.eventId,
    fixture.startDate,
    fixture.startTime,
    `${fixture.startDate} ${fixture.startTime}`,
    `#${fixture.eventId}`,
  ]
}

export function filterFixtures(
  fixtures: Fixture[],
  query: string,
): Fixture[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return fixtures

  return fixtures.filter((fixture) =>
    getFixtureSearchValues(fixture).some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    ),
  )
}
