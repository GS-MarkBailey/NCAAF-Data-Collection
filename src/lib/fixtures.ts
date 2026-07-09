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
  teams: 'all',
  query: '',
}

export function hasActiveFixtureFilters(filters: FixtureFilters): boolean {
  return (
    filters.startDate !== 'all' ||
    filters.startTime !== 'all' ||
    filters.teams !== 'all' ||
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

export function getUniqueFixtureTeams(fixtures: Fixture[]): string[] {
  const teams = new Set<string>()

  for (const fixture of fixtures) {
    teams.add(fixture.homeTeam)
    teams.add(fixture.awayTeam)
  }

  return [...teams].sort((a, b) => a.localeCompare(b))
}

function getFixtureSearchValues(fixture: Fixture): string[] {
  const scheduled = isFixtureScheduled(fixture)
  const values = [
    fixture.id,
    fixture.eventId,
    `#${fixture.eventId}`,
    fixture.homeTeam,
    fixture.homeAbbr,
    fixture.awayTeam,
    fixture.awayAbbr,
    `${fixture.homeTeam} vs ${fixture.awayTeam}`,
    `${fixture.homeAbbr} vs ${fixture.awayAbbr}`,
    fixture.startDate,
    fixture.startTime,
    `${fixture.startDate} ${fixture.startTime}`,
    scheduled ? 'scheduled' : 'past',
  ]

  if (fixture.finalScore) {
    const { home, away } = fixture.finalScore
    values.push(
      String(home),
      String(away),
      `${home}-${away}`,
      `${home}–${away}`,
      `${home} - ${away}`,
    )
  }

  return values
}

export function filterFixtures(
  fixtures: Fixture[],
  filters: FixtureFilters,
): Fixture[] {
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

    if (
      filters.teams !== 'all' &&
      fixture.homeTeam !== filters.teams &&
      fixture.awayTeam !== filters.teams
    ) {
      return false
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
