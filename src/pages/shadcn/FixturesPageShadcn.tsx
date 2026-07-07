import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  filterFixtures,
  isFixtureScheduled,
  sortFixturesByKickoffDesc,
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

export function FixturesPageShadcn() {
  const navigate = useNavigate()
  const fixtures = useAppStore((s) => s.fixtures)
  const initGame = useAppStore((s) => s.initGame)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFixtures = useMemo(() => {
    const filtered = filterFixtures(fixtures, searchQuery)
    return sortFixturesByKickoffDesc(filtered)
  }, [fixtures, searchQuery])

  const searchActive = searchQuery.trim().length > 0

  const openFixture = (fixtureId: string) => {
    initGame(fixtureId)
    navigate(`/game/${fixtureId}`)
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="fixture-search">Search fixtures</Label>
            {searchActive ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-6 px-2 text-xs"
                onClick={() => setSearchQuery('')}
              >
                Clear
              </Button>
            ) : null}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="fixture-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Team, fixture ID, start date, or kickoff time"
              className="pl-8"
            />
          </div>
        </div>
      </header>

      <Separator />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 pb-4">
        {filteredFixtures.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No fixtures match your search.
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
