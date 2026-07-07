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

export interface FixtureFilters {
  startDate: string
  startTime: string
  teams: string
  query: string
}

export const EMPTY_FIXTURE_FILTERS: FixtureFilters = {
  startDate: 'all',
  startTime: 'all',
  teams: '',
  query: '',
}

export function hasActiveFixtureFilters(filters: FixtureFilters): boolean {
  return (
    filters.startDate !== 'all' ||
    filters.startTime !== 'all' ||
    filters.teams.trim().length > 0 ||
    filters.query.trim().length > 0
  )
}

export function getUniqueFixtureDates(fixtures: Fixture[]): string[] {
  return [...new Set(fixtures.map((fixture) => fixture.startDate))].sort(
    (a, b) => b.localeCompare(a),
  )
}

export function getUniqueFixtureTimes(fixtures: Fixture[]): string[] {
  return [...new Set(fixtures.map((fixture) => fixture.startTime))].sort()
}

function getFixtureSearchValues(fixture: Fixture): string[] {
  return [
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
  filters: FixtureFilters,
): Fixture[] {
  const teamsQuery = filters.teams.trim().toLowerCase()
  const searchQuery = filters.query.trim().toLowerCase()

  return fixtures.filter((fixture) => {
    if (
      filters.startDate !== 'all' &&
      fixture.startDate !== filters.startDate
    ) {
      return false
    }

    if (
      filters.startTime !== 'all' &&
      fixture.startTime !== filters.startTime
    ) {
      return false
    }

    if (teamsQuery) {
      const matchesTeam = [
        fixture.homeTeam,
        fixture.awayTeam,
        fixture.homeAbbr,
        fixture.awayAbbr,
      ].some((value) => value.toLowerCase().includes(teamsQuery))

      if (!matchesTeam) return false
    }

    if (searchQuery) {
      const matchesSearch = getFixtureSearchValues(fixture).some((value) =>
        value.toLowerCase().includes(searchQuery),
      )

      if (!matchesSearch) return false
    }

    return true
  })
}
