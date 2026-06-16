import { useNavigate } from 'react-router-dom'
import { Calendar, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/store/gameStore'

export function FixturesPageShadcn() {
  const navigate = useNavigate()
  const fixtures = useAppStore((s) => s.fixtures)
  const initGame = useAppStore((s) => s.initGame)

  const openFixture = (fixtureId: string) => {
    initGame(fixtureId)
    navigate(`/game/${fixtureId}`)
  }

  return (
    <div className="flex h-dvh flex-col bg-background safe-x safe-b">
      <header className="shrink-0 space-y-1 px-4 py-6">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Fixtures</h1>
          <Badge variant="secondary">shadcn</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Select a match to open the data collection console
        </p>
      </header>

      <Separator />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 landscape-mobile:flex-row landscape-mobile:overflow-x-auto landscape-mobile:overflow-y-hidden">
        {fixtures.map((fixture) => (
          <Card
            key={fixture.id}
            className="w-full shrink-0 landscape-mobile:w-72"
          >
            <CardHeader>
              <CardTitle className="text-base">{fixture.homeTeam}</CardTitle>
              <CardDescription>vs {fixture.awayTeam}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                {fixture.startDate} · {fixture.startTime}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => openFixture(fixture.id)}
              >
                Open console
                <ChevronRight data-icon="inline-end" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
