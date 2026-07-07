import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isFixtureScheduled, sortFixturesByKickoffDesc } from '@/lib/fixtures'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/store/gameStore'

export function FixturesPageShadcn() {
  const navigate = useNavigate()
  const fixtures = useAppStore((s) => s.fixtures)
  const initGame = useAppStore((s) => s.initGame)
  const sortedFixtures = useMemo(
    () => sortFixturesByKickoffDesc(fixtures),
    [fixtures],
  )

  const openFixture = (fixtureId: string) => {
    initGame(fixtureId)
    navigate(`/game/${fixtureId}`)
  }

  return (
    <div className="flex h-dvh flex-col bg-background safe-x safe-t safe-b">
      <header className="shrink-0 space-y-1 px-4 py-6">
        <h1 className="text-lg font-semibold tracking-tight">Fixtures</h1>
        <p className="text-sm text-muted-foreground">
          Select a match to open the data collection console
        </p>
      </header>

      <Separator />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 pb-4">
        {sortedFixtures.map((fixture) => {
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
        )})}
      </div>
    </div>
  )
}
