import { useState, type CSSProperties } from 'react'
import { LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/format'
import {
  clockFromParts,
  clockToParts,
  getQuarterStatus,
  isAwaitingQuarterStart,
  isRegulationComplete,
  nextQuarterNumber,
  type QuarterStatus,
} from '@/lib/clock'
import { usePushPulse } from '@/hooks/usePushPulse'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { useAppStore } from '@/store/gameStore'
import { getEffectiveHomeAttacksRight } from '@/lib/playSimulation'
import { BallOnStatCell } from '@/components/game/BallOnStatCell'
import { ClockWheelEditor } from '@/components/game/ClockWheelEditor'
import { PeriodControl } from '@/components/game/PeriodControl'
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
  const offenseIsHome = useAppStore(
    (s) =>
      s.games[fixtureId]?.simulation?.offenseIsHome ??
      s.games[fixtureId]?.possessionIsHome ??
      true,
  )
  const homeAbbr = useAppStore((s) => s.games[fixtureId]?.fixture.homeAbbr ?? '')
  const awayAbbr = useAppStore((s) => s.games[fixtureId]?.fixture.awayAbbr ?? '')
  const homeAttacksRightBase = useAppStore(
    (s) => s.games[fixtureId]?.homeAttacksRight ?? false,
  )
  const homeAttacksRight = getEffectiveHomeAttacksRight(
    homeAttacksRightBase,
    clockPeriod,
  )

  const setClockTime = useAppStore((s) => s.setClockTime)
  const setClockPeriod = useAppStore((s) => s.setClockPeriod)
  const setPossession = useAppStore((s) => s.setPossession)
  const showQuarterStatus = useFeatureFlag('scoreboard.quarterStatus')
  const showPossessionSwitch = useFeatureFlag('scoreboard.possessionSwitch')

  const [editingClock, setEditingClock] = useState(false)
  const [draftMinutes, setDraftMinutes] = useState(0)
  const [draftSeconds, setDraftSeconds] = useState(0)

  const paused = !clockRunning
  const awaitingQuarterStart = isAwaitingQuarterStart({
    seconds: clockSeconds,
    period: clockPeriod,
  })
  const regulationComplete = isRegulationComplete({
    seconds: clockSeconds,
    period: clockPeriod,
  })

  const handleOpenClockEditor = () => {
    if (regulationComplete) return

    const parts = clockToParts(clockSeconds)
    setDraftMinutes(parts.minutes)
    setDraftSeconds(parts.seconds)
    setEditingClock(true)
  }

  const handleCancelClockEdit = () => {
    setEditingClock(false)
  }

  const handleConfirmClockEdit = () => {
    setClockTime(fixtureId, clockFromParts(draftMinutes, draftSeconds))
    setEditingClock(false)
  }

  return (
    <Card size="compact" className="flex min-h-0 flex-1 flex-col">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm">
          <LayoutGrid className="size-4 text-muted-foreground" />
          Scoreboard
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex min-h-0 flex-1 items-stretch overflow-hidden rounded-lg border border-border">
          <PeriodControl
            period={clockPeriod}
            onPeriodChange={(period) => setClockPeriod(fixtureId, period)}
          />
          {editingClock ? (
            <div className="grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
              <ClockWheelEditor
                minutes={draftMinutes}
                seconds={draftSeconds}
                onMinutesChange={setDraftMinutes}
                onSecondsChange={setDraftSeconds}
              />
              <div className="flex gap-2 border-t border-border bg-background p-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCancelClockEdit}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
                  onClick={handleConfirmClockEdit}
                >
                  Confirm
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={cn(
                'flex h-full min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-2 rounded-none border-0 bg-transparent px-2 transition-colors',
                awaitingQuarterStart && 'bg-[var(--color-primary-bg)]',
                regulationComplete && 'bg-muted',
                !regulationComplete && 'hover:bg-muted/40 active:bg-muted/60',
              )}
              onClick={handleOpenClockEditor}
              disabled={regulationComplete}
              aria-label={`Edit game clock, currently ${formatClock(clockSeconds)}`}
            >
              <span className="text-[2rem] font-bold leading-none tabular-nums">
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
            </button>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
          <div className="flex min-h-0 flex-1 items-stretch">
            <StatCell
              label="QTR"
              value={clockPeriod}
              status={
                showQuarterStatus
                  ? getQuarterStatus({
                      seconds: clockSeconds,
                      running: clockRunning,
                    })
                  : undefined
              }
            />
            <StatCell label="DOWN" value={down} />
            <StatCell label="TO GO" value={distance} />
            <BallOnStatCell
              ballOn={ballOn}
              offenseIsHome={offenseIsHome}
              homeAttacksRight={homeAttacksRight}
              pulseEndColor="var(--card)"
              shellClassName="border-border py-4 landscape-mobile:py-3"
              labelClassName="text-muted-foreground"
              valueClassName="text-foreground"
            />
          </div>

          {showPossessionSwitch ? (
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
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

const QUARTER_STATUS_CLASS: Record<
  QuarterStatus,
  { className: string; pulseEnd: string }
> = {
  in_play: { className: 'bg-emerald-50', pulseEnd: '#ecfdf5' },
  in_progress: { className: 'bg-amber-50', pulseEnd: '#fffbeb' },
  ended: { className: 'bg-red-50', pulseEnd: '#fef2f2' },
}

function StatCell({
  label,
  value,
  status,
}: {
  label: string
  value: number
  status?: QuarterStatus
}) {
  const pulsing = usePushPulse(value)
  const statusStyle = status ? QUARTER_STATUS_CLASS[status] : undefined

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-1 flex-col items-center justify-center border-r border-border px-1 py-4 last:border-r-0 landscape-mobile:py-3',
        statusStyle?.className,
        pulsing && 'push-data-pulse',
      )}
      style={
        {
          '--push-pulse-end': statusStyle?.pulseEnd ?? 'var(--card)',
        } as CSSProperties
      }
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
