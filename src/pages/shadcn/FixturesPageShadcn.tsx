import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Search } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/store/gameStore'

const SELECT_FILTER_CLASS =
  'h-8 shrink-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

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
      <header className="shrink-0 space-y-3 px-4 py-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Fixtures</h1>
          <p className="text-sm text-muted-foreground">
            Select a match to open the data collection console
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="grid min-w-[40rem] grid-cols-[8.5rem_7rem_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
          <select
            id="fixture-filter-date"
            value={filters.startDate}
            onChange={(event) => updateFilter('startDate', event.target.value)}
            aria-label="Start date"
            className={cn(SELECT_FILTER_CLASS, 'w-[8.5rem]')}
          >
            <option value="all">All dates</option>
            {uniqueDates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>

          <select
            id="fixture-filter-time"
            value={filters.startTime}
            onChange={(event) => updateFilter('startTime', event.target.value)}
            aria-label="Start time"
            className={cn(SELECT_FILTER_CLASS, 'w-[7rem]')}
          >
            <option value="all">All times</option>
            {uniqueTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>

          <Input
            id="fixture-filter-teams"
            value={filters.teams}
            onChange={(event) => updateFilter('teams', event.target.value)}
            placeholder="Teams"
            aria-label="Teams"
            className="min-w-0"
          />

          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="fixture-search"
              value={filters.query}
              onChange={(event) => updateFilter('query', event.target.value)}
              placeholder="ID, date, time"
              aria-label="Search fixtures"
              className="pl-8"
            />
          </div>

          {filtersActive ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-8 shrink-0 px-2 text-xs"
              onClick={() => setFilters(EMPTY_FIXTURE_FILTERS)}
            >
              Clear
            </Button>
          ) : (
            <span aria-hidden className="size-0" />
          )}
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
