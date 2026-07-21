import { useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'
import { LayoutGrid, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/format'
import {
  clockFromParts,
  clockToParts,
  getQuarterStatus,
  canEndCurrentPeriod,
  canStartNextPeriod,
  canStartOvertime,
  canUsePlayPauseWithoutPeriodManagement,
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
import { MATCH_ENDED_STAT } from '@/lib/scoreboard'
import { BallOnStatCell } from '@/components/game/BallOnStatCell'
import { ClockNumericEditor } from '@/components/game/ClockNumericEditor'
import { ClockWheelEditor } from '@/components/game/ClockWheelEditor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ScoreboardPanelShadcnProps {
  fixtureId: string
  layout?: 'stack' | 'column'
}

const PRIMARY_ACTION_BADGE_CLASS =
  'rounded-full border-[var(--color-primary-border)] bg-[var(--color-primary-chip-bg)] text-[10px] font-bold tracking-wider text-[var(--color-primary-chip-text)] uppercase'

const PORTRAIT_PANEL_CLASS = 'min-h-0 flex-1 border border-border ring-0'

type PendingConfirmation = 'endPeriod' | 'endGame' | 'startOvertime'

const CONFIRMATION_TITLE: Record<PendingConfirmation, string> = {
  endPeriod: 'End period?',
  endGame: 'End game?',
  startOvertime: 'Start overtime?',
}

export function ScoreboardPanelShadcn({
  fixtureId,
  layout = 'column',
}: ScoreboardPanelShadcnProps) {
  const clockSeconds = useAppStore((s) => s.games[fixtureId]?.clock.seconds ?? 0)
  const clockRunning = useAppStore((s) => s.games[fixtureId]?.clock.running ?? false)
  const clockPeriod = useAppStore((s) => s.games[fixtureId]?.clock.period ?? 1)
  const gameStarted = useAppStore((s) => s.games[fixtureId]?.gameStarted ?? false)
  const gameEnded = useAppStore((s) => s.games[fixtureId]?.gameEnded ?? false)
  const periodEnded = useAppStore((s) => s.games[fixtureId]?.periodEnded ?? false)
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
  const showClockWheelEditor = useFeatureFlag('scoreboard.clockWheelEditor')
  const showClockNumericEditor = useFeatureFlag('scoreboard.clockNumericEditor')
  const showPlayPause = useFeatureFlag('scoreboard.playPause')
  const showPeriodManagement = useFeatureFlag('scoreboard.periodManagement')
  const showDownDistance = useFeatureFlag('scoreboard.downDistance')
  const showBallOn = useFeatureFlag('scoreboard.ballOn')
  const stacked = layout === 'stack'

  const [editingClock, setEditingClock] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null)
  const [draftPeriod, setDraftPeriod] = useState(1)
  const [draftMinutes, setDraftMinutes] = useState(0)
  const [draftSeconds, setDraftSeconds] = useState(0)
  const [clockEditSession, setClockEditSession] = useState(0)

  const paused = !clockRunning
  const pregame = !gameStarted
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
  const showEndPeriodButton = canEndCurrentPeriod(
    gameStarted,
    gameEnded,
    periodEnded,
    {
      seconds: clockSeconds,
      period: clockPeriod,
      running: clockRunning,
    },
  )
  const showStartPeriodButton = canStartNextPeriod(
    gameStarted,
    gameEnded,
    periodEnded,
    {
      seconds: clockSeconds,
      period: clockPeriod,
    },
  )
  const showStartOvertimeButton = canStartOvertime(
    gameStarted,
    gameEnded,
    periodEnded,
    {
      seconds: clockSeconds,
      period: clockPeriod,
    },
  )
  const inOvertime = isOvertimePeriod(clockPeriod)
  const showEndOvertimeButton = inOvertime && !gameEnded
  const showPlayPauseButton = showPeriodManagement
    ? gameStarted && !gameEnded && periodInProgress
    : canUsePlayPauseWithoutPeriodManagement(gameEnded, {
        seconds: clockSeconds,
      })
  const clockLocked = gameEnded

  const handleOpenClockEditor = () => {
    if (!showClockWheelEditor || clockLocked || inOvertime || pendingConfirmation) return

    const parts = clockToParts(clockSeconds)
    setDraftPeriod(clockPeriod)
    setDraftMinutes(parts.minutes)
    setDraftSeconds(parts.seconds)
    setClockEditSession((session) => session + 1)
    setEditingClock(true)
  }

  const handleCancelClockEdit = () => {
    setEditingClock(false)
  }

  const handleCancelConfirmation = () => {
    setPendingConfirmation(null)
  }

  const handleConfirmAction = () => {
    if (!pendingConfirmation) return

    switch (pendingConfirmation) {
      case 'endPeriod':
        endPeriod(fixtureId)
        break
      case 'endGame':
        endGame(fixtureId)
        break
      case 'startOvertime':
        startOvertime(fixtureId)
        break
    }

    setPendingConfirmation(null)
  }

  const openConfirmation = (
    action: PendingConfirmation,
    event?: MouseEvent<HTMLButtonElement>,
  ) => {
    event?.stopPropagation()
    setPendingConfirmation(action)
  }

  const handleConfirmClockEdit = () => {
    setClockTime(fixtureId, clockFromParts(draftMinutes, draftSeconds))
    setClockPeriod(fixtureId, draftPeriod)
    setEditingClock(false)
  }

  const handlePlayPause = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation()
    if (!showPlayPause || !showPlayPauseButton || gameEnded || pendingConfirmation) return
    toggleClock(fixtureId)
  }

  const handleToggleClock = () => {
    handlePlayPause()
  }

  const canUsePlayPause = showPlayPause && showPlayPauseButton
  const canToggleClock =
    !clockLocked && canUsePlayPause && !showClockWheelEditor

  const useClockEditPanel = showClockWheelEditor && showClockNumericEditor
  const editingClockInline = editingClock && !useClockEditPanel
  const editingClockPanel = editingClock && useClockEditPanel

  const handleEndPeriod = (event: MouseEvent<HTMLButtonElement>) => {
    openConfirmation('endPeriod', event)
  }

  const handleStartPeriod = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    startPeriod(fixtureId)
  }

  const handleStartOvertime = (event: MouseEvent<HTMLButtonElement>) => {
    openConfirmation('startOvertime', event)
  }

  const handleEndGame = (event: MouseEvent<HTMLButtonElement>) => {
    openConfirmation('endGame', event)
  }

  const handleContainerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!canToggleClock || event.target !== event.currentTarget) return

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggleClock()
    }
  }

  const clockDisplayLabel =
    gameEnded || inOvertime
      ? stacked
        ? 'text-base tracking-wider uppercase'
        : 'text-lg tracking-wider uppercase'
      : stacked
        ? 'text-[1.75rem] tabular-nums'
        : 'text-[2rem] tabular-nums'

  const clockDisplayText = gameEnded
    ? 'Match ended'
    : inOvertime
      ? 'OVERTIME'
      : formatClock(clockSeconds)

  const clockSurfaceClassName = cn(
    showPeriodManagement &&
      (pregame ||
        showEndPeriodButton ||
        showStartPeriodButton ||
        showStartOvertimeButton) &&
      'bg-[var(--color-primary-bg)]',
    gameEnded && 'bg-muted',
  )

  const clockAreaClassName = cn(
    'relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-2 transition-colors',
    clockSurfaceClassName,
    !stacked &&
      canToggleClock &&
      'cursor-pointer hover:bg-muted/40 active:bg-muted/60',
  )

  const actionBadges = (
    <>
      {showPeriodManagement && showStartPeriodButton ? (
        <Badge
          render={
            <button
              type="button"
              onClick={handleStartPeriod}
              aria-label={`Start quarter ${nextQuarterNumber(clockPeriod)}`}
            />
          }
          className={PRIMARY_ACTION_BADGE_CLASS}
        >
          Start Q{nextQuarterNumber(clockPeriod)}
        </Badge>
      ) : null}
      {showPeriodManagement && showEndPeriodButton ? (
        <Badge
          render={
            <button
              type="button"
              onClick={handleEndPeriod}
              aria-label="End period"
            />
          }
          className={PRIMARY_ACTION_BADGE_CLASS}
        >
          End period
        </Badge>
      ) : null}
      {showPeriodManagement && pregame ? (
        <Badge
          render={
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                startPeriod(fixtureId)
              }}
              aria-label="Kick off game"
            />
          }
          className={PRIMARY_ACTION_BADGE_CLASS}
        >
          Kick off
        </Badge>
      ) : null}
      {showPeriodManagement && showStartOvertimeButton ? (
        <Badge
          render={
            <button
              type="button"
              onClick={handleStartOvertime}
              aria-label="Start overtime"
            />
          }
          className={PRIMARY_ACTION_BADGE_CLASS}
        >
          Start overtime
        </Badge>
      ) : null}
      {showPeriodManagement && showEndOvertimeButton ? (
        <Badge
          render={
            <button
              type="button"
              onClick={handleEndGame}
              aria-label="End game"
            />
          }
          className={PRIMARY_ACTION_BADGE_CLASS}
        >
          End game
        </Badge>
      ) : null}
      {gameEnded ? <Badge variant="secondary">Final</Badge> : null}
      {showPlayPause && showPlayPauseButton ? (
        <Badge
          variant="outline"
          render={
            <button
              type="button"
              onClick={handlePlayPause}
              aria-label={paused ? 'Start clock' : 'Pause clock'}
              aria-pressed={!paused}
            />
          }
          className={cn(
            'gap-1 border font-semibold',
            paused
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              : 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100',
          )}
        >
          {paused ? (
            <Play className="size-3 fill-current" aria-hidden />
          ) : (
            <Pause className="size-3 fill-current" aria-hidden />
          )}
          {paused ? 'Start' : 'Pause'}
        </Badge>
      ) : null}
    </>
  )

  const showActionBar =
    gameEnded ||
    (showPeriodManagement &&
      (showStartPeriodButton ||
        showEndPeriodButton ||
        pregame ||
        showStartOvertimeButton ||
        showEndOvertimeButton)) ||
    (showPlayPause && showPlayPauseButton)

  const clockEditButton = showClockWheelEditor ? (
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
        disabled={clockLocked || (inOvertime && !gameEnded)}
        aria-label={
          gameEnded
            ? 'Match ended'
            : inOvertime
              ? 'Overtime in progress'
              : `Edit game clock, currently ${formatClock(clockSeconds)}`
        }
      >
        <span className={cn('layout-clock-display font-bold leading-none', clockDisplayLabel)}>
          {clockDisplayText}
        </span>
      </button>
    ) : (
      <span className={cn('layout-clock-display font-bold leading-none', clockDisplayLabel)}>
        {clockDisplayText}
      </span>
    )

  return (
    <>
    <Card
      size="compact"
      className={cn(
        'flex min-h-0 flex-1 flex-col',
        stacked && PORTRAIT_PANEL_CLASS,
      )}
    >
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm">
          <LayoutGrid className="size-4 text-muted-foreground" />
          Scoreboard
        </CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-2',
          stacked && 'gap-1.5',
        )}
      >
        <div
          className={cn(
            'relative flex min-h-0 flex-1 items-stretch overflow-hidden rounded-lg border border-border',
          )}
        >
          {pendingConfirmation ? (
            <div className="grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center">
                <p className="text-sm font-semibold text-foreground">
                  {pendingConfirmation === 'endPeriod'
                    ? `End Q${clockPeriod}?`
                    : CONFIRMATION_TITLE[pendingConfirmation]}
                </p>
              </div>
              <div className="flex gap-2 border-t border-border bg-background p-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCancelConfirmation}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
                  onClick={handleConfirmAction}
                >
                  Confirm
                </Button>
              </div>
            </div>
          ) : editingClockInline ? (
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                <ClockWheelEditor
                  key={clockEditSession}
                  period={draftPeriod}
                  minutes={draftMinutes}
                  seconds={draftSeconds}
                  onPeriodChange={setDraftPeriod}
                  onMinutesChange={setDraftMinutes}
                  onSecondsChange={setDraftSeconds}
                />
              </div>
              <div className="relative z-10 flex shrink-0 gap-2 border-t border-border bg-background p-2">
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
          ) : stacked ? (
            <div
              className={cn(
                'grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden',
                clockSurfaceClassName,
              )}
            >
              <div
                className={cn(
                  'relative flex min-h-0 flex-1 items-center justify-center px-2',
                  canToggleClock &&
                    'cursor-pointer hover:bg-muted/40 active:bg-muted/60',
                )}
                role={canToggleClock ? 'button' : undefined}
                tabIndex={canToggleClock ? 0 : undefined}
                aria-label={
                  gameEnded
                    ? 'Game final'
                    : canUsePlayPause
                      ? paused
                        ? 'Start clock'
                        : 'Pause clock'
                      : 'Game clock'
                }
                onClick={canToggleClock ? handleToggleClock : undefined}
                onKeyDown={canToggleClock ? handleContainerKeyDown : undefined}
              >
                {clockEditButton}
                {showPeriodManagement && awaitingRegulationDecision && periodEnded ? (
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
              {showActionBar ? (
                <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 px-2 pb-2">
                  {actionBadges}
                </div>
              ) : null}
            </div>
          ) : (
            <div
              role="presentation"
              tabIndex={canToggleClock ? 0 : undefined}
              aria-label={
                gameEnded
                  ? 'Game final'
                  : canUsePlayPause
                    ? paused
                      ? 'Start clock'
                      : 'Pause clock'
                    : 'Game clock'
              }
              onClick={canToggleClock ? handleToggleClock : undefined}
              onKeyDown={handleContainerKeyDown}
              className={clockAreaClassName}
            >
              {clockEditButton}
              <div className="pointer-events-none absolute inset-x-2 bottom-2 flex justify-center gap-2">
                <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
                  {actionBadges}
                </div>
              </div>
              {showPeriodManagement && awaitingRegulationDecision && periodEnded ? (
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
          <div
            className={cn(
              'flex items-stretch',
              stacked ? 'min-h-10 shrink-0' : 'min-h-0 flex-1',
            )}
          >
            <StatCell
              label="QTR"
              value={clockPeriod}
              displayValue={
                gameEnded
                  ? MATCH_ENDED_STAT
                  : isOvertimePeriod(clockPeriod)
                    ? 'OT'
                    : undefined
              }
              compact={stacked}
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
            {showDownDistance ? (
              <>
                <StatCell
                  label="DOWN"
                  value={down}
                  displayValue={gameEnded ? MATCH_ENDED_STAT : undefined}
                  compact={stacked}
                />
                <StatCell
                  label="TO GO"
                  value={distance}
                  displayValue={gameEnded ? MATCH_ENDED_STAT : undefined}
                  compact={stacked}
                />
              </>
            ) : null}
            {showBallOn ? (
              <BallOnStatCell
                ballOn={ballOn}
                offenseIsHome={offenseIsHome}
                homeAttacksRight={homeAttacksRight}
                inactive={gameEnded}
                compact={stacked}
                pulseEndColor="var(--card)"
                shellClassName="border-border"
                labelClassName="text-muted-foreground"
                valueClassName="text-foreground"
              />
            ) : null}
          </div>

          {showPossessionSwitch ? (
            <div className="grid min-h-0 flex-1 grid-cols-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                disabled={gameEnded}
                onClick={() => setPossession(fixtureId, true)}
                aria-pressed={gameEnded ? false : possessionIsHome}
                aria-label={`Give possession to ${homeAbbr}`}
                className={cn(
                  'h-full min-h-0 rounded-none border-0 border-r border-border py-0 font-semibold',
                  stacked ? 'text-base' : 'text-lg',
                  !gameEnded &&
                    possessionIsHome &&
                    'rounded-bl-lg bg-[var(--color-score-bg)] text-white hover:bg-[var(--color-score-bg)] hover:text-white',
                )}
              >
                {homeAbbr}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={gameEnded}
                onClick={() => setPossession(fixtureId, false)}
                aria-pressed={gameEnded ? false : !possessionIsHome}
                aria-label={`Give possession to ${awayAbbr}`}
                className={cn(
                  'h-full min-h-0 rounded-none border-0 py-0 font-semibold',
                  stacked ? 'text-base' : 'text-lg',
                  !gameEnded &&
                    !possessionIsHome &&
                    'rounded-br-lg bg-[var(--color-score-bg)] text-white hover:bg-[var(--color-score-bg)] hover:text-white',
                )}
              >
                {awayAbbr}
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>

    <Dialog
      open={editingClockPanel}
      onOpenChange={(open) => {
        if (!open) handleCancelClockEdit()
      }}
    >
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader className="border-b border-border px-4 pt-4 pb-3">
          <DialogTitle>Edit clock</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center px-3 py-4">
          <ClockNumericEditor
            key={clockEditSession}
            period={draftPeriod}
            minutes={draftMinutes}
            seconds={draftSeconds}
            onPeriodChange={setDraftPeriod}
            onMinutesChange={setDraftMinutes}
            onSecondsChange={setDraftSeconds}
          />
        </div>
        <DialogFooter className="m-0 rounded-none border-t border-border bg-muted/30 px-4 py-3 sm:justify-stretch">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleCancelClockEdit}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
            onClick={handleConfirmClockEdit}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
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
  compact = false,
}: {
  label: string
  value: number
  displayValue?: string
  status?: QuarterStatus
  compact?: boolean
}) {
  const pulsing = usePushPulse(value)
  const statusStyle = status ? QUARTER_STATUS_CLASS[status] : undefined

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-1 flex-col items-center border-r border-border px-1 last:border-r-0 landscape-mobile:py-3',
        compact
          ? 'min-h-10 shrink-0 justify-center gap-0.5 py-1'
          : 'justify-center gap-1 py-4',
        statusStyle?.className,
        pulsing && 'push-data-pulse',
      )}
      style={
        {
          '--push-pulse-end': statusStyle?.pulseEnd ?? 'var(--card)',
        } as CSSProperties
      }
    >
      <span
        className={cn(
          'font-medium uppercase tracking-wide text-muted-foreground leading-none',
          compact ? 'text-[9px]' : 'text-[10px]',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'font-bold leading-none',
          compact ? 'text-lg' : 'text-2xl landscape-mobile:text-xl',
        )}
      >
        {displayValue ?? value}
      </span>
    </div>
  )
}
