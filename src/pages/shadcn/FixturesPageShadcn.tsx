import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  EMPTY_FIXTURE_FILTERS,
  filterFixtures,
  getUniqueFixtureDates,
  getUniqueFixtureTimes,
  hasActiveFixtureFilters,
  isFixtureScheduled,
  sortFixturesByKickoffDesc,
  type FixtureFilters,
} from '@/lib/fixtures'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/store/gameStore'

const FILTER_FIELD_CLASS =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

export function FixturesPageShadcn() {
  const navigate = useNavigate()
  const fixtures = useAppStore((s) => s.fixtures)
  const initGame = useAppStore((s) => s.initGame)
  const [filters, setFilters] = useState<FixtureFilters>(EMPTY_FIXTURE_FILTERS)

  const uniqueDates = useMemo(() => getUniqueFixtureDates(fixtures), [fixtures])
  const uniqueTimes = useMemo(() => getUniqueFixtureTimes(fixtures), [fixtures])

  const filteredFixtures = useMemo(() => {
    const filtered = filterFixtures(fixtures, filters)
    return sortFixturesByKickoffDesc(filtered)
  }, [fixtures, filters])

  const filtersActive = hasActiveFixtureFilters(filters)

  const openFixture = (fixtureId: string) => {
    initGame(fixtureId)
    navigate(`/game/${fixtureId}`)
  }

  const updateFilter = <K extends keyof FixtureFilters>(
    key: K,
    value: FixtureFilters[K],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="flex h-dvh flex-col bg-background safe-x safe-t safe-b">
      <header className="shrink-0 space-y-4 px-4 py-6">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Fixtures</h1>
          <p className="text-sm text-muted-foreground">
            Select a match to open the data collection console
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Filters
            </p>
            {filtersActive ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-6 px-2 text-xs"
                onClick={() => setFilters(EMPTY_FIXTURE_FILTERS)}
              >
                Clear filters
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fixture-filter-date">Start date</Label>
              <select
                id="fixture-filter-date"
                value={filters.startDate}
                onChange={(event) =>
                  updateFilter('startDate', event.target.value)
                }
                className={FILTER_FIELD_CLASS}
              >
                <option value="all">All dates</option>
                {uniqueDates.map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fixture-filter-time">Start time</Label>
              <select
                id="fixture-filter-time"
                value={filters.startTime}
                onChange={(event) =>
                  updateFilter('startTime', event.target.value)
                }
                className={FILTER_FIELD_CLASS}
              >
                <option value="all">All times</option>
                {uniqueTimes.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fixture-filter-teams">Teams</Label>
              <Input
                id="fixture-filter-teams"
                value={filters.teams}
                onChange={(event) => updateFilter('teams', event.target.value)}
                placeholder="Search team name or abbreviation"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fixture-filter-id">Fixture ID</Label>
              <Input
                id="fixture-filter-id"
                value={filters.fixtureId}
                onChange={(event) =>
                  updateFilter('fixtureId', event.target.value)
                }
                placeholder="Search fixture or event ID"
              />
            </div>
          </div>
        </div>
      </header>

      <Separator />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 pb-4">
        {filteredFixtures.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No fixtures match your filters.
            </p>
          </div>
        ) : (
          filteredFixtures.map((fixture) => {
            const scheduled = isFixtureScheduled(fixture)

            return (
              <Card
                key={fixture.id}
                role="button"
                tabIndex={0}
                className="w-full shrink-0 cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted"
                onClick={() => openFixture(fixture.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openFixture(fixture.id)
                  }
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {fixture.homeTeam}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        vs
                      </span>
                      <span className="truncate text-sm font-semibold">
                        {fixture.awayTeam}
                      </span>
                    </div>
                    <Badge
                      variant={scheduled ? 'outline' : 'secondary'}
                      className={cn(
                        'shrink-0',
                        scheduled &&
                          'border-emerald-200 bg-emerald-50 text-emerald-800',
                      )}
                    >
                      {scheduled ? 'Scheduled' : 'Past'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" />
                    {fixture.startDate} · {fixture.startTime} · #{fixture.eventId}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
