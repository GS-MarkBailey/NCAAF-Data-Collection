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
  fixtureId: string
}

export const EMPTY_FIXTURE_FILTERS: FixtureFilters = {
  startDate: 'all',
  startTime: 'all',
  teams: '',
  fixtureId: '',
}

export function hasActiveFixtureFilters(filters: FixtureFilters): boolean {
  return (
    filters.startDate !== 'all' ||
    filters.startTime !== 'all' ||
    filters.teams.trim().length > 0 ||
    filters.fixtureId.trim().length > 0
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

export function filterFixtures(
  fixtures: Fixture[],
  filters: FixtureFilters,
): Fixture[] {
  const teamsQuery = filters.teams.trim().toLowerCase()
  const fixtureIdQuery = filters.fixtureId.trim().toLowerCase()

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

    if (fixtureIdQuery) {
      const matchesFixtureId =
        fixture.id.toLowerCase().includes(fixtureIdQuery) ||
        fixture.eventId.toLowerCase().includes(fixtureIdQuery)

      if (!matchesFixtureId) return false
    }

    return true
  })
}
