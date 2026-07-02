import { useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'
import { LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/format'
import {
  clockFromParts,
  clockToParts,
  getQuarterStatus,
  isAwaitingQuarterStart,
  canEndCurrentPeriod,
  isAwaitingRegulationDecision,
  isOvertimePeriod,
  isPeriodInProgress,
  nextQuarterNumber,
  type QuarterStatus,
} from '@/lib/clock'
import { usePushPulse } from '@/hooks/usePushPulse'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { useAppStore } from '@/store/gameStore'
import { getEffectiveHomeAttacksRight } from '@/lib/playSimulation'
import { BallOnStatCell } from '@/components/game/BallOnStatCell'
import { ClockWheelEditor } from '@/components/game/ClockWheelEditor'
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

const PRIMARY_ACTION_BADGE_CLASS =
  'rounded-full border-[var(--color-primary-border)] bg-[var(--color-primary-chip-bg)] text-[10px] font-bold tracking-wider text-[var(--color-primary-chip-text)] uppercase'

export function ScoreboardPanelShadcn({ fixtureId }: ScoreboardPanelShadcnProps) {
  const clockSeconds = useAppStore((s) => s.games[fixtureId]?.clock.seconds ?? 0)
  const clockRunning = useAppStore((s) => s.games[fixtureId]?.clock.running ?? false)
  const clockPeriod = useAppStore((s) => s.games[fixtureId]?.clock.period ?? 1)
  const gameStarted = useAppStore((s) => s.games[fixtureId]?.gameStarted ?? false)
  const gameEnded = useAppStore((s) => s.games[fixtureId]?.gameEnded ?? false)
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
  const toggleClock = useAppStore((s) => s.toggleClock)
  const startPeriod = useAppStore((s) => s.startPeriod)
  const endPeriod = useAppStore((s) => s.endPeriod)
  const startOvertime = useAppStore((s) => s.startOvertime)
  const endGame = useAppStore((s) => s.endGame)
  const setPossession = useAppStore((s) => s.setPossession)
  const showQuarterStatus = useFeatureFlag('scoreboard.quarterStatus')
  const showPossessionSwitch = useFeatureFlag('scoreboard.possessionSwitch')

  const [editingClock, setEditingClock] = useState(false)
  const [draftPeriod, setDraftPeriod] = useState(1)
  const [draftMinutes, setDraftMinutes] = useState(0)
  const [draftSeconds, setDraftSeconds] = useState(0)

  const paused = !clockRunning
  const pregame = !gameStarted
  const awaitingQuarterStart = isAwaitingQuarterStart(
    {
      seconds: clockSeconds,
      period: clockPeriod,
    },
    gameStarted,
  )
  const awaitingRegulationDecision = isAwaitingRegulationDecision(
    gameStarted,
    gameEnded,
    {
      seconds: clockSeconds,
      period: clockPeriod,
    },
  )
  const periodInProgress = isPeriodInProgress(gameStarted, gameEnded, {
    seconds: clockSeconds,
    period: clockPeriod,
  })
  const showEndPeriodButton = canEndCurrentPeriod(gameStarted, gameEnded, {
    seconds: clockSeconds,
    period: clockPeriod,
    running: clockRunning,
  })
  const inOvertime = isOvertimePeriod(clockPeriod)
  const showEndOvertimeButton =
    inOvertime && !gameEnded && paused && clockSeconds > 0
  const clockLocked = gameEnded

  const handleOpenClockEditor = () => {
    if (clockLocked || inOvertime) return

    const parts = clockToParts(clockSeconds)
    setDraftPeriod(clockPeriod)
    setDraftMinutes(parts.minutes)
    setDraftSeconds(parts.seconds)
    setEditingClock(true)
  }

  const handleCancelClockEdit = () => {
    setEditingClock(false)
  }

  const handleConfirmClockEdit = () => {
    setClockTime(fixtureId, clockFromParts(draftMinutes, draftSeconds))
    setClockPeriod(fixtureId, draftPeriod)
    setEditingClock(false)
  }

  const handleToggleClock = () => {
    if (gameEnded) return

    if (pregame || awaitingQuarterStart) {
      startPeriod(fixtureId)
      return
    }

    if (awaitingRegulationDecision) {
      startOvertime(fixtureId)
      return
    }

    toggleClock(fixtureId)
  }

  const handleEndPeriod = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    endPeriod(fixtureId)
  }

  const handleEndGame = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    endGame(fixtureId)
  }

  const handleContainerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (gameEnded || event.target !== event.currentTarget) return

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggleClock()
    }
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
        <div className="relative flex min-h-0 flex-1 items-stretch overflow-hidden rounded-lg border border-border">
          {editingClock ? (
            <div className="grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
              <ClockWheelEditor
                period={draftPeriod}
                minutes={draftMinutes}
                seconds={draftSeconds}
                onPeriodChange={setDraftPeriod}
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
            <div
              role="presentation"
              tabIndex={clockLocked ? undefined : 0}
              aria-label={
                gameEnded
                  ? 'Game final'
                  : awaitingRegulationDecision
                    ? 'Start overtime'
                    : pregame
                      ? 'Kick off game'
                      : awaitingQuarterStart
                        ? `Start quarter ${nextQuarterNumber(clockPeriod)}`
                        : paused
                          ? 'Start clock'
                          : 'Pause clock'
              }
              onClick={handleToggleClock}
              onKeyDown={handleContainerKeyDown}
              className={cn(
                'relative flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-2 px-2 transition-colors',
                (pregame || awaitingQuarterStart) && 'bg-[var(--color-primary-bg)]',
                awaitingRegulationDecision && 'bg-[var(--color-primary-bg)]',
                gameEnded && 'bg-muted',
                !clockLocked && 'cursor-pointer hover:bg-muted/40 active:bg-muted/60',
              )}
            >
              <button
                type="button"
                className={cn(
                  'rounded-md border-0 bg-transparent px-2 py-1 transition-colors',
                  !clockLocked && !inOvertime && 'hover:bg-muted/60 active:bg-muted/80',
                )}
                onClick={(event) => {
                  event.stopPropagation()
                  handleOpenClockEditor()
                }}
                disabled={clockLocked || inOvertime}
                aria-label={
                  inOvertime
                    ? 'Overtime in progress'
                    : `Edit game clock, currently ${formatClock(clockSeconds)}`
                }
              >
                <span
                  className={cn(
                    'font-bold leading-none',
                    inOvertime
                      ? 'text-lg tracking-wider uppercase'
                      : 'text-[2rem] tabular-nums',
                  )}
                >
                  {inOvertime ? 'OVERTIME' : formatClock(clockSeconds)}
                </span>
              </button>
              <div className="pointer-events-none absolute inset-x-2 bottom-2 flex justify-center gap-2">
                {showEndPeriodButton ? (
                  <Badge
                    render={
                      <button
                        type="button"
                        className="pointer-events-auto"
                        onClick={handleEndPeriod}
                        aria-label="End period"
                      />
                    }
                    className={PRIMARY_ACTION_BADGE_CLASS}
                  >
                    End PRD
                  </Badge>
                ) : null}
                {pregame && (
                  <Badge className={PRIMARY_ACTION_BADGE_CLASS}>Kick off</Badge>
                )}
                {awaitingQuarterStart && !showEndPeriodButton ? (
                  <Badge className={PRIMARY_ACTION_BADGE_CLASS}>
                    Start Q{nextQuarterNumber(clockPeriod)}
                  </Badge>
                ) : null}
                {awaitingRegulationDecision && (
                  <Badge className={PRIMARY_ACTION_BADGE_CLASS}>
                    Start overtime
                  </Badge>
                )}
                {gameEnded && <Badge variant="secondary">Final</Badge>}
                {paused && periodInProgress && (
                  <Badge variant="destructive">Paused</Badge>
                )}
              </div>
              {showEndOvertimeButton ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 z-10 h-7 border-border bg-background text-[10px] font-bold tracking-wider uppercase shadow-sm"
                  onClick={handleEndGame}
                >
                  End game
                </Button>
              ) : null}
              {awaitingRegulationDecision ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 z-10 h-7 border-border bg-background text-[10px] font-bold tracking-wider uppercase shadow-sm"
                  onClick={handleEndGame}
                >
                  End game
                </Button>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
          <div className="flex min-h-0 flex-1 items-stretch">
            <StatCell
              label="QTR"
              value={clockPeriod}
              displayValue={isOvertimePeriod(clockPeriod) ? 'OT' : undefined}
              status={
                showQuarterStatus
                  ? pregame || gameEnded
                    ? 'ended'
                    : getQuarterStatus({
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
  displayValue,
  status,
}: {
  label: string
  value: number
  displayValue?: string
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
        {displayValue ?? value}
      </span>
    </div>
  )
}
