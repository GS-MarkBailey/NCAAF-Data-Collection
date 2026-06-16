import { type CSSProperties } from 'react'
import { LayoutGrid, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/format'
import {
  isAwaitingQuarterStart,
  isRegulationComplete,
  nextQuarterNumber,
} from '@/lib/clock'
import { usePushPulse } from '@/hooks/usePushPulse'
import { useAppStore } from '@/store/gameStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface ScoreboardPanelShadcnProps {
  fixtureId: string
}

export function ScoreboardPanelShadcn({ fixtureId }: ScoreboardPanelShadcnProps) {
  const clockSeconds = useAppStore((s) => s.games[fixtureId]?.clock.seconds ?? 0)
  const clockRunning = useAppStore((s) => s.games[fixtureId]?.clock.running ?? false)
  const clockPeriod = useAppStore((s) => s.games[fixtureId]?.clock.period ?? 1)
  const down = useAppStore((s) => s.games[fixtureId]?.down ?? 1)
  const distance = useAppStore((s) => s.games[fixtureId]?.distance ?? 10)
  const ballOn = useAppStore((s) => s.games[fixtureId]?.ballOn ?? 25)
  const possessionIsHome = useAppStore(
    (s) => s.games[fixtureId]?.possessionIsHome ?? true,
  )
  const homeAbbr = useAppStore((s) => s.games[fixtureId]?.fixture.homeAbbr ?? '')
  const awayAbbr = useAppStore((s) => s.games[fixtureId]?.fixture.awayAbbr ?? '')

  const toggleClock = useAppStore((s) => s.toggleClock)
  const adjustClock = useAppStore((s) => s.adjustClock)
  const startNextQuarter = useAppStore((s) => s.startNextQuarter)
  const setPossession = useAppStore((s) => s.setPossession)

  const paused = !clockRunning
  const awaitingQuarterStart = isAwaitingQuarterStart({
    seconds: clockSeconds,
    period: clockPeriod,
  })
  const regulationComplete = isRegulationComplete({
    seconds: clockSeconds,
    period: clockPeriod,
  })

  const handleClockPress = () => {
    if (awaitingQuarterStart) {
      startNextQuarter(fixtureId)
      return
    }
    toggleClock(fixtureId)
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm">
          <LayoutGrid className="size-4 text-muted-foreground" />
          Scoreboard
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex min-h-0 flex-1 items-stretch overflow-hidden rounded-lg border border-border">
          <Button
            variant="ghost"
            className="h-full min-h-0 rounded-none border-r border-border px-3 active:bg-[var(--color-primary-bg)]"
            onClick={() => adjustClock(fixtureId, -1)}
            aria-label="Decrease clock by 1 second"
          >
            <Minus />
          </Button>

          <Button
            variant="ghost"
            className={cn(
              'h-full min-h-0 flex-1 rounded-none border-r border-border',
              awaitingQuarterStart && 'bg-[var(--color-primary-bg)] hover:bg-[var(--color-primary-bg)]',
              regulationComplete && 'bg-muted',
            )}
            onClick={handleClockPress}
            disabled={regulationComplete}
            aria-label={
              awaitingQuarterStart
                ? `Start quarter ${nextQuarterNumber(clockPeriod)}`
                : paused
                  ? 'Start clock'
                  : 'Pause clock'
            }
            aria-pressed={!paused && !awaitingQuarterStart && !regulationComplete}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-[2rem] font-bold leading-none">
                {formatClock(clockSeconds)}
              </span>
              {awaitingQuarterStart && (
                <Badge className="rounded-full border-[var(--color-primary-border)] bg-[var(--color-primary-chip-bg)] text-[10px] font-bold tracking-wider text-[var(--color-primary-chip-text)] uppercase">
                  Start Q{nextQuarterNumber(clockPeriod)}
                </Badge>
              )}
              {regulationComplete && (
                <Badge variant="secondary">End of regulation</Badge>
              )}
              {paused && !awaitingQuarterStart && !regulationComplete && (
                <Badge variant="destructive">Paused</Badge>
              )}
            </div>
          </Button>

          <Button
            variant="ghost"
            className="h-full min-h-0 rounded-none px-3 active:bg-[var(--color-primary-bg)]"
            onClick={() => adjustClock(fixtureId, 1)}
            aria-label="Increase clock by 1 second"
          >
            <Plus />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
          <div className="flex min-h-0 flex-1 items-stretch">
            <StatCell label="QTR" value={clockPeriod} />
            <StatCell label="DOWN" value={down} />
            <StatCell label="TO GO" value={distance} />
            <StatCell label="BALL ON" value={ballOn} />
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPossession(fixtureId, true)}
              aria-pressed={possessionIsHome}
              aria-label={`Give possession to ${homeAbbr}`}
              className={cn(
                'h-full min-h-0 rounded-none border-0 border-r border-border py-0 text-lg font-semibold',
                possessionIsHome && 'bg-[var(--color-score-bg)] text-white hover:bg-[var(--color-score-bg)] hover:text-white',
              )}
            >
              {homeAbbr}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPossession(fixtureId, false)}
              aria-pressed={!possessionIsHome}
              aria-label={`Give possession to ${awayAbbr}`}
              className={cn(
                'h-full min-h-0 rounded-none border-0 py-0 text-lg font-semibold',
                !possessionIsHome && 'bg-[var(--color-score-bg)] text-white hover:bg-[var(--color-score-bg)] hover:text-white',
              )}
            >
              {awayAbbr}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCell({ label, value }: { label: string; value: number }) {
  const pulsing = usePushPulse(value)

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-1 flex-col items-center justify-center border-r border-border px-1 py-4 last:border-r-0 landscape-mobile:py-3',
        pulsing && 'push-data-pulse',
      )}
      style={{ '--push-pulse-end': 'var(--card)' } as CSSProperties}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="mt-1 text-2xl font-bold leading-none landscape-mobile:text-xl">
        {value}
      </span>
    </div>
  )
}
