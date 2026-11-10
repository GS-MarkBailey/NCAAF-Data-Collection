import { useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'
import { LayoutGrid, Minus, Pause, Pencil, Play, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/format'
import {
  clockFromParts,
  clockToParts,
  formatPeriodLabel,
  getFootballRuleset,
  getQuarterStatus,
  canEndCurrentPeriod,
  canStartNextPeriod,
  canStartOvertime,
  canUsePlayPauseWithoutPeriodManagement,
  isAwaitingRegulationDecision,
  isOvertimePeriod,
  isPeriodInProgress,
  type QuarterStatus,
} from '@/lib/football'
import { usePushPulse } from '@/hooks/usePushPulse'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { useAppStore } from '@/store/gameStore'
import { getEffectiveHomeAttacksRight } from '@/lib/playSimulation'
import { MATCH_ENDED_STAT } from '@/lib/scoreboard'
import {
  CONSOLE_PANEL_CARD_CLASS,
  CONSOLE_PANEL_HEADER_CLASS,
  CONSOLE_PANEL_TITLE_CLASS,
  OPERATOR_SECONDARY_SURFACE,
} from '@/lib/operatorChrome'
import { BallOnEditor } from '@/components/game/BallOnEditor'
import { BallOnStatCell } from '@/components/game/BallOnStatCell'
import { ClockNumericEditor, type ClockEditTab } from '@/components/game/ClockNumericEditor'
import { DownDistanceEditor, type DownDistanceEditTab } from '@/components/game/DownDistanceEditor'
import { ClockWheelEditor } from '@/components/game/ClockWheelEditor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface ScoreboardPanelShadcnProps {
  fixtureId: string
  layout?: 'stack' | 'column'
}

const PRIMARY_ACTION_BADGE_CLASS =
  'rounded-full border-[var(--color-primary-border)] bg-[var(--color-primary-chip-bg)] text-[10px] font-bold tracking-wider text-[var(--color-primary-chip-text)] uppercase'

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
  const periodActive = useAppStore((s) => s.games[fixtureId]?.periodActive ?? false)
  const down = useAppStore((s) => s.games[fixtureId]?.down ?? 1)
  const distance = useAppStore((s) => s.games[fixtureId]?.distance ?? 10)
  const ballOn = useAppStore((s) => s.games[fixtureId]?.ballOn ?? 25)
  const rulesetId = useAppStore((s) => s.games[fixtureId]?.rulesetId)
  const possessionIsHome = useAppStore(
    (s) => s.games[fixtureId]?.possessionIsHome ?? true,
  )
  // Ball-on / field direction follow possession (not stale sim offense).
  const offenseIsHome = useAppStore(
    (s) => s.games[fixtureId]?.possessionIsHome ?? true,
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
  const adjustClock = useAppStore((s) => s.adjustClock)
  const toggleClock = useAppStore((s) => s.toggleClock)
  const endPeriod = useAppStore((s) => s.endPeriod)
  const startOvertime = useAppStore((s) => s.startOvertime)
  const endGame = useAppStore((s) => s.endGame)
  const setPossession = useAppStore((s) => s.setPossession)
  const setDown = useAppStore((s) => s.setDown)
  const setDistance = useAppStore((s) => s.setDistance)
  const setBallOn = useAppStore((s) => s.setBallOn)
  const setPeriodActive = useAppStore((s) => s.setPeriodActive)
  const scoreHome = useAppStore((s) => s.games[fixtureId]?.score.home ?? 0)
  const scoreAway = useAppStore((s) => s.games[fixtureId]?.score.away ?? 0)
  const showQuarterStatus = useFeatureFlag('scoreboard.quarterStatus')
  const showPossessionSwitch = useFeatureFlag('scoreboard.possessionSwitch')
  const showClockWheelEditor = useFeatureFlag('scoreboard.clockWheelEditor')
  const showClockNumericEditor = useFeatureFlag('scoreboard.clockNumericEditor')
  const showPlayPause = useFeatureFlag('scoreboard.playPause')
  const showPeriodManagement = useFeatureFlag('scoreboard.periodManagement')
  const showDownDistance = useFeatureFlag('scoreboard.downDistance')
  const showBallOn = useFeatureFlag('scoreboard.ballOn')
  const showBallOnArrow = useFeatureFlag('scoreboard.ballOnArrow')
  const stacked = layout === 'stack'
  const score = { home: scoreHome, away: scoreAway }
  const regulationPeriodCount = getFootballRuleset(rulesetId).regulationPeriods

  const [editingClock, setEditingClock] = useState(false)
  const [clockEditTab, setClockEditTab] = useState<ClockEditTab>('time')
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null)
  const [draftPeriod, setDraftPeriod] = useState(1)
  const [draftMinutes, setDraftMinutes] = useState(0)
  const [draftSeconds, setDraftSeconds] = useState(0)
  const [clockEditSession, setClockEditSession] = useState(0)
  const clockMinutesInputRef = useRef<HTMLInputElement>(null)
  const [editingDownDistance, setEditingDownDistance] = useState(false)
  const [downDistanceTab, setDownDistanceTab] =
    useState<DownDistanceEditTab>('down')
  const [draftDown, setDraftDown] = useState(1)
  const [draftDistance, setDraftDistance] = useState(10)
  const [downDistanceSession, setDownDistanceSession] = useState(0)
  const [editingBallOn, setEditingBallOn] = useState(false)
  const [draftBallOn, setDraftBallOn] = useState(25)
  const [ballOnSession, setBallOnSession] = useState(0)
  /** After confirming period edit / end period — Yes/No for periodActive. */
  const [askingPeriodInProgress, setAskingPeriodInProgress] = useState(false)
  /** Which scoreboard region shows the period-in-progress prompt. */
  const [periodAskRegion, setPeriodAskRegion] = useState<'clock' | 'stats'>(
    'stats',
  )

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
    rulesetId,
    score,
  )
  const inOvertime = isOvertimePeriod(clockPeriod)
  const atRegulationDecision =
    awaitingRegulationDecision && periodEnded && !gameEnded
  const showEndOvertimeButton = inOvertime && !gameEnded
  const showRegulationEndGame = atRegulationDecision
  const showPlayPauseButton = showPeriodManagement
    ? !gameEnded &&
      (periodInProgress || showStartPeriodButton)
    : !gameEnded &&
      (canUsePlayPauseWithoutPeriodManagement(gameEnded, {
          seconds: clockSeconds,
        }) ||
        showStartPeriodButton)
  const clockLocked = gameEnded

  const handleOpenClockEditor = (tab: ClockEditTab = 'time') => {
    if (
      !showClockWheelEditor ||
      clockLocked ||
      inOvertime ||
      pendingConfirmation ||
      askingPeriodInProgress
    )
      return

    const parts = clockToParts(clockSeconds)
    setEditingDownDistance(false)
    setEditingBallOn(false)
    setAskingPeriodInProgress(false)
    setDraftPeriod(clockPeriod)
    setDraftMinutes(parts.minutes)
    setDraftSeconds(parts.seconds)
    setClockEditTab(tab)
    setClockEditSession((session) => session + 1)
    setEditingClock(true)
  }

  const canOpenClockEditor =
    showClockWheelEditor && !clockLocked && !inOvertime && !pendingConfirmation

  const canOpenDownDistanceEditor =
    showDownDistance && !gameEnded && !pendingConfirmation

  const canOpenBallOnEditor =
    showBallOn && !gameEnded && !pendingConfirmation

  const handleOpenDownDistanceEditor = (tab: DownDistanceEditTab) => {
    if (!canOpenDownDistanceEditor || askingPeriodInProgress) return
    setEditingClock(false)
    setEditingBallOn(false)
    setAskingPeriodInProgress(false)
    setDraftDown(down)
    setDraftDistance(distance)
    setDownDistanceTab(tab)
    setDownDistanceSession((session) => session + 1)
    setEditingDownDistance(true)
  }

  const handleOpenBallOnEditor = () => {
    if (!canOpenBallOnEditor || askingPeriodInProgress) return
    setEditingClock(false)
    setEditingDownDistance(false)
    setAskingPeriodInProgress(false)
    setDraftBallOn(ballOn)
    setBallOnSession((session) => session + 1)
    setEditingBallOn(true)
  }

  const handlePeriodInProgressAnswer = (inProgress: boolean) => {
    setPeriodActive(fixtureId, inProgress)
    setAskingPeriodInProgress(false)
  }

  const handleCancelDownDistanceEdit = () => {
    setEditingDownDistance(false)
  }

  const handleConfirmDownDistanceEdit = () => {
    setDown(fixtureId, draftDown)
    setDistance(fixtureId, draftDistance)
    setEditingDownDistance(false)
  }

  const handleCancelBallOnEdit = () => {
    setEditingBallOn(false)
  }

  const handleConfirmBallOnEdit = () => {
    setBallOn(fixtureId, draftBallOn)
    setEditingBallOn(false)
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
      case 'endPeriod': {
        const endingFinalRegulation = clockPeriod >= regulationPeriodCount
        endPeriod(fixtureId)
        setEditingClock(false)
        setEditingDownDistance(false)
        setEditingBallOn(false)
        // Q4 (final regulation): show OT / end-game decision instead of
        // "period in progress?" — OT only appears when scores are level.
        if (!endingFinalRegulation) {
          setPeriodAskRegion('clock')
          setAskingPeriodInProgress(true)
        }
        break
      }
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
    if (clockEditTab === 'period') {
      setPeriodAskRegion('stats')
      setAskingPeriodInProgress(true)
    }
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

  // Editors stay inside the region that opened them (clock face vs stats strip).
  const editingClockTime = editingClock && clockEditTab === 'time'
  const editingPeriodInStats = editingClock && clockEditTab === 'period'
  const askingInClock =
    askingPeriodInProgress && periodAskRegion === 'clock'
  const askingInStats =
    askingPeriodInProgress && periodAskRegion === 'stats'
  const editingStatsRegion =
    editingPeriodInStats ||
    editingDownDistance ||
    editingBallOn ||
    askingInStats
  const statsEditorTitle = askingInStats
    ? 'period in progress?'
    : editingBallOn
      ? 'Edit ball on'
      : editingDownDistance
        ? downDistanceTab === 'distance'
          ? 'Edit to go'
          : 'Edit down'
        : 'Edit period'

  const handleEndPeriod = (event: MouseEvent<HTMLButtonElement>) => {
    openConfirmation('endPeriod', event)
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
    'relative flex min-h-0 flex-1 items-stretch transition-colors',
    clockSurfaceClassName,
  )

  const maxClockSeconds = getFootballRuleset(rulesetId).quarterLengthSeconds
  const canNudgeClock = !gameEnded && !inOvertime
  const clockNudgeButtonClass = cn(
    'flex w-10 shrink-0 items-center justify-center self-stretch text-muted-foreground transition-colors',
    'hover:bg-muted/60 active:bg-muted/80',
    'disabled:pointer-events-none disabled:opacity-35',
  )

  const nudgeClock = (delta: number) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    adjustClock(fixtureId, delta)
  }

  const clockNudgeMinus = (
    <button
      type="button"
      className={cn(clockNudgeButtonClass, 'border-r border-border')}
      disabled={!canNudgeClock || clockSeconds <= 0}
      aria-label="Decrease clock by 1 second"
      title="−1 second"
      onClick={nudgeClock(-1)}
    >
      <Minus className="size-4" aria-hidden />
    </button>
  )

  const clockNudgePlus = (
    <button
      type="button"
      className={cn(clockNudgeButtonClass, 'border-l border-border')}
      disabled={!canNudgeClock || clockSeconds >= maxClockSeconds}
      aria-label="Increase clock by 1 second"
      title="+1 second (max 15:00)"
      onClick={nudgeClock(1)}
    >
      <Plus className="size-4" aria-hidden />
    </button>
  )

  // END PERIOD appears in the scoreboard header after Start begins the period.
  // Kickoff is not required — Start alone arms it.
  const showEndPeriodChip =
    periodActive && !gameEnded && !periodEnded && !inOvertime
  // Same header slot as END PERIOD — after regulation ends (or during OT).
  const showEndGameChip =
    !showEndPeriodChip &&
    !gameEnded &&
    (showRegulationEndGame || showEndOvertimeButton)

  const scoreboardHeaderAction = showEndPeriodChip ? (
    <CardAction className="static row-span-1 self-center justify-self-auto">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        title="End period"
        aria-label="End period"
        className="h-7 gap-1 border border-red-200 bg-red-50 px-2 text-xs font-medium text-red-800 hover:bg-red-100 hover:text-red-800"
        onClick={handleEndPeriod}
      >
        END PERIOD
      </Button>
    </CardAction>
  ) : showEndGameChip ? (
    <CardAction className="static row-span-1 self-center justify-self-auto">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        title="End game"
        aria-label="End game"
        className="h-7 gap-1 border border-red-200 bg-red-50 px-2 text-xs font-medium text-red-800 hover:bg-red-100 hover:text-red-800"
        onClick={handleEndGame}
      >
        END GAME
      </Button>
    </CardAction>
  ) : null

  const actionBadges = (
    <>
      {showStartOvertimeButton ? (
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
            'relative gap-1 border font-semibold',
            'before:absolute before:-inset-y-3 before:-inset-x-3 before:content-[""]',
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
    showStartOvertimeButton ||
    (showPeriodManagement && (showStartPeriodButton || pregame)) ||
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
          handleOpenClockEditor('time')
        }}
        disabled={clockLocked || (inOvertime && !gameEnded)}
        aria-label={
          gameEnded
            ? 'Match ended'
            : inOvertime
              ? 'Overtime in progress'
              : `Edit game clock time, currently ${formatClock(clockSeconds)}`
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
    <Card size="compact" className={CONSOLE_PANEL_CARD_CLASS}>
      <CardHeader className={CONSOLE_PANEL_HEADER_CLASS}>
        <CardTitle className={CONSOLE_PANEL_TITLE_CLASS}>
          <LayoutGrid className="size-4 shrink-0 text-muted-foreground" />
          Scoreboard
        </CardTitle>
        {scoreboardHeaderAction}
      </CardHeader>
      <CardContent
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-2',
          stacked && 'gap-1.5',
        )}
      >
        {atRegulationDecision && !pendingConfirmation ? (
          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-border">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
              <p className="text-sm font-semibold text-foreground">
                {showStartOvertimeButton
                  ? 'Scores are level'
                  : 'Regulation complete'}
              </p>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {scoreHome} – {scoreAway}
              </p>
              <p className="text-xs text-muted-foreground">
                {showStartOvertimeButton
                  ? 'Start overtime or end the game'
                  : 'End the game to finalize the result'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2 border-t border-border bg-background p-2">
              {showStartOvertimeButton ? (
                <Button
                  type="button"
                  variant="secondary"
                  className={cn(
                    'h-10 min-h-10 flex-1 shrink-0 touch-manipulation',
                    OPERATOR_SECONDARY_SURFACE,
                  )}
                  onClick={handleStartOvertime}
                >
                  Start overtime
                </Button>
              ) : null}
              <Button
                type="button"
                className="h-10 min-h-10 flex-1 shrink-0 touch-manipulation bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
                onClick={handleEndGame}
              >
                End game
              </Button>
            </div>
          </div>
        ) : (
          <>
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
                      className="h-8 min-h-8 flex-1 shrink-0"
                      onClick={handleCancelConfirmation}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="h-8 min-h-8 flex-1 shrink-0 bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
                      onClick={handleConfirmAction}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              ) : askingInClock ? (
                <div className="grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center">
                    <p className="text-sm font-semibold text-foreground">
                      period in progress?
                    </p>
                  </div>
                  <div className="flex gap-2 border-t border-border bg-background p-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className={cn(
                        'h-8 min-h-8 flex-1 shrink-0 touch-manipulation',
                        OPERATOR_SECONDARY_SURFACE,
                      )}
                      onClick={() => handlePeriodInProgressAnswer(true)}
                    >
                      Yes
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className={cn(
                        'h-8 min-h-8 flex-1 shrink-0 touch-manipulation',
                        OPERATOR_SECONDARY_SURFACE,
                      )}
                      onClick={() => handlePeriodInProgressAnswer(false)}
                    >
                      No
                    </Button>
                  </div>
                </div>
              ) : editingClockTime ? (
                <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 py-2">
                    {showClockNumericEditor ? (
                      <ClockNumericEditor
                        key={clockEditSession}
                        period={draftPeriod}
                        minutes={draftMinutes}
                        seconds={draftSeconds}
                        onPeriodChange={setDraftPeriod}
                        onMinutesChange={setDraftMinutes}
                        onSecondsChange={setDraftSeconds}
                        initialTab="time"
                        minutesInputRef={clockMinutesInputRef}
                      />
                    ) : (
                      <ClockWheelEditor
                        key={clockEditSession}
                        minutes={draftMinutes}
                        seconds={draftSeconds}
                        onMinutesChange={setDraftMinutes}
                        onSecondsChange={setDraftSeconds}
                      />
                    )}
                  </div>
                  <div className="relative z-10 flex shrink-0 gap-2 border-t border-border bg-background p-2">
                    <Button
                      variant="outline"
                      className="h-8 min-h-8 flex-1 shrink-0"
                      onClick={handleCancelClockEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="h-8 min-h-8 flex-1 shrink-0 bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
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
                  <div className="relative flex min-h-0 flex-1 items-stretch">
                    {clockNudgeMinus}
                    <div
                      className={cn(
                        'relative flex min-h-0 min-w-0 flex-1 items-center justify-center px-2',
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
                      onKeyDown={
                        canToggleClock ? handleContainerKeyDown : undefined
                      }
                    >
                      {clockEditButton}
                    </div>
                    {clockNudgePlus}
                  </div>
                  {showActionBar ? (
                    <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 px-2 pb-2">
                      {actionBadges}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className={clockAreaClassName}>
                  {clockNudgeMinus}
                  <div
                    role={canToggleClock ? 'button' : 'presentation'}
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
                    onKeyDown={
                      canToggleClock ? handleContainerKeyDown : undefined
                    }
                    className={cn(
                      'relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-2 px-2',
                      canToggleClock &&
                        'cursor-pointer hover:bg-muted/40 active:bg-muted/60',
                    )}
                  >
                    {clockEditButton}
                  </div>
                  {clockNudgePlus}
                  <div className="pointer-events-none absolute inset-x-2 bottom-2 flex justify-center gap-2">
                    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
                      {actionBadges}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className={cn(
                'grid min-h-0 flex-1 overflow-hidden rounded-lg border border-border',
                editingStatsRegion
                  ? 'grid-rows-[auto_minmax(0,1fr)_auto]'
                  : showPossessionSwitch
                    ? 'grid-rows-[minmax(0,1fr)_auto]'
                    : 'grid-rows-[minmax(0,1fr)]',
              )}
            >
              {editingStatsRegion ? (
                <>
                  <div className="shrink-0 border-b border-border px-3 py-2">
                    <p className="text-center text-sm font-semibold text-foreground">
                      {statsEditorTitle}
                    </p>
                  </div>
                  <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-2 py-3">
                    {askingInStats ? null : editingBallOn ? (
                      <BallOnEditor
                        key={ballOnSession}
                        ballOn={draftBallOn}
                        onBallOnChange={setDraftBallOn}
                        rulesetId={rulesetId}
                      />
                    ) : editingDownDistance ? (
                      <DownDistanceEditor
                        key={downDistanceSession}
                        down={draftDown}
                        distance={draftDistance}
                        onDownChange={setDraftDown}
                        onDistanceChange={setDraftDistance}
                        initialTab={downDistanceTab}
                        rulesetId={rulesetId}
                      />
                    ) : (
                      <ClockNumericEditor
                        key={clockEditSession}
                        period={draftPeriod}
                        minutes={draftMinutes}
                        seconds={draftSeconds}
                        onPeriodChange={setDraftPeriod}
                        onMinutesChange={setDraftMinutes}
                        onSecondsChange={setDraftSeconds}
                        initialTab="period"
                      />
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2 border-t border-border bg-background p-2">
                    {askingInStats ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          className={cn(
                            'h-8 min-h-8 flex-1 shrink-0 touch-manipulation',
                            OPERATOR_SECONDARY_SURFACE,
                          )}
                          onClick={() => handlePeriodInProgressAnswer(true)}
                        >
                          Yes
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className={cn(
                            'h-8 min-h-8 flex-1 shrink-0 touch-manipulation',
                            OPERATOR_SECONDARY_SURFACE,
                          )}
                          onClick={() => handlePeriodInProgressAnswer(false)}
                        >
                          No
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 min-h-8 flex-1 shrink-0 touch-manipulation"
                          onClick={
                            editingBallOn
                              ? handleCancelBallOnEdit
                              : editingDownDistance
                                ? handleCancelDownDistanceEdit
                                : handleCancelClockEdit
                          }
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          className="h-8 min-h-8 flex-1 shrink-0 touch-manipulation bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
                          onClick={
                            editingBallOn
                              ? handleConfirmBallOnEdit
                              : editingDownDistance
                                ? handleConfirmDownDistanceEdit
                                : handleConfirmClockEdit
                          }
                        >
                          Confirm
                        </Button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={cn(
                      'flex min-h-0 items-stretch',
                      stacked && 'min-h-10',
                    )}
                  >
                    <StatCell
                      label="QTR"
                      value={clockPeriod}
                      displayValue={
                        gameEnded
                          ? MATCH_ENDED_STAT
                          : formatPeriodLabel(clockPeriod)
                      }
                      compact={stacked}
                      interactive={canOpenClockEditor}
                      showEditIcon={canOpenClockEditor}
                      onClick={
                        canOpenClockEditor
                          ? () => handleOpenClockEditor('period')
                          : undefined
                      }
                      ariaLabel={
                        canOpenClockEditor
                          ? `Edit period, currently ${formatPeriodLabel(clockPeriod)}`
                          : undefined
                      }
                      periodPhase={getPeriodPhase({
                        periodActive,
                        periodEnded,
                        gameEnded,
                        endPending: pendingConfirmation === 'endPeriod',
                      })}
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
                          displayValue={
                            gameEnded ? MATCH_ENDED_STAT : undefined
                          }
                          compact={stacked}
                          interactive={canOpenDownDistanceEditor}
                          onClick={
                            canOpenDownDistanceEditor
                              ? () => handleOpenDownDistanceEditor('down')
                              : undefined
                          }
                          ariaLabel={
                            canOpenDownDistanceEditor
                              ? `Edit down, currently ${down}`
                              : undefined
                          }
                        />
                        <StatCell
                          label="TO GO"
                          value={distance}
                          displayValue={
                            gameEnded ? MATCH_ENDED_STAT : undefined
                          }
                          compact={stacked}
                          interactive={canOpenDownDistanceEditor}
                          onClick={
                            canOpenDownDistanceEditor
                              ? () =>
                                  handleOpenDownDistanceEditor('distance')
                              : undefined
                          }
                          ariaLabel={
                            canOpenDownDistanceEditor
                              ? `Edit yards to go, currently ${distance}`
                              : undefined
                          }
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
                        showArrow={showBallOnArrow}
                        interactive={canOpenBallOnEditor}
                        onClick={
                          canOpenBallOnEditor
                            ? handleOpenBallOnEditor
                            : undefined
                        }
                        ariaLabel={
                          canOpenBallOnEditor
                            ? `Edit ball on, currently ${ballOn}`
                            : undefined
                        }
                        pulseEndColor="var(--card)"
                        shellClassName="border-border"
                        labelClassName="text-muted-foreground"
                        valueClassName="text-foreground"
                        rulesetId={rulesetId}
                      />
                    ) : null}
                  </div>

                  {showPossessionSwitch ? (
                    <div className="grid shrink-0 grid-cols-2 border-t border-border">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={gameEnded}
                        onClick={() => setPossession(fixtureId, true)}
                        aria-pressed={gameEnded ? false : possessionIsHome}
                        aria-label={`Give possession to ${homeAbbr}`}
                        className={cn(
                          'h-8 min-h-8 rounded-none border-0 border-r border-border py-0 text-sm font-semibold',
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
                        size="sm"
                        disabled={gameEnded}
                        onClick={() => setPossession(fixtureId, false)}
                        aria-pressed={gameEnded ? false : !possessionIsHome}
                        aria-label={`Give possession to ${awayAbbr}`}
                        className={cn(
                          'h-8 min-h-8 rounded-none border-0 py-0 text-sm font-semibold',
                          !gameEnded &&
                            !possessionIsHome &&
                            'rounded-br-lg bg-[var(--color-score-bg)] text-white hover:bg-[var(--color-score-bg)] hover:text-white',
                        )}
                      >
                        {awayAbbr}
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
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

type PeriodPhase = 'not_started' | 'in_progress' | 'end_pending' | 'ended'

const PERIOD_PHASE_LABEL: Record<PeriodPhase, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  end_pending: 'End Pending',
  ended: 'Ended',
}

const PERIOD_PHASE_CLASS: Record<
  PeriodPhase,
  { className: string; pulseEnd: string }
> = {
  not_started: { className: 'bg-amber-50', pulseEnd: '#fffbeb' },
  in_progress: { className: 'bg-emerald-50', pulseEnd: '#ecfdf5' },
  end_pending: { className: 'bg-orange-50', pulseEnd: '#fff7ed' },
  ended: { className: 'bg-red-50', pulseEnd: '#fef2f2' },
}

function getPeriodPhase(params: {
  periodActive: boolean
  periodEnded: boolean
  gameEnded: boolean
  /** True while END PERIOD confirmation is open. */
  endPending?: boolean
}): PeriodPhase {
  if (params.gameEnded || params.periodEnded) return 'ended'
  if (params.endPending) return 'end_pending'
  if (params.periodActive) return 'in_progress'
  return 'not_started'
}

function StatCell({
  label,
  value,
  displayValue,
  status,
  periodPhase,
  compact = false,
  interactive = false,
  showEditIcon = false,
  onClick,
  ariaLabel,
}: {
  label: string
  value: number
  displayValue?: string
  status?: QuarterStatus
  periodPhase?: PeriodPhase
  compact?: boolean
  interactive?: boolean
  showEditIcon?: boolean
  onClick?: () => void
  ariaLabel?: string
}) {
  const pulsing = usePushPulse(value)
  const phaseStyle = periodPhase ? PERIOD_PHASE_CLASS[periodPhase] : undefined
  const statusStyle = status ? QUARTER_STATUS_CLASS[status] : undefined
  const surfaceStyle = phaseStyle ?? statusStyle
  const phaseLabel = periodPhase ? PERIOD_PHASE_LABEL[periodPhase] : undefined

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        'relative flex h-full min-h-0 flex-1 flex-col items-center border-r border-border px-1 last:border-r-0',
        compact ? 'min-h-10 shrink-0 py-1' : 'py-2 landscape-mobile:py-2',
        surfaceStyle?.className,
        pulsing && 'push-data-pulse',
        interactive &&
          'cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted/70',
      )}
      style={
        {
          '--push-pulse-end': surfaceStyle?.pulseEnd ?? 'var(--card)',
        } as CSSProperties
      }
    >
      {showEditIcon ? (
        <Pencil
          aria-hidden
          className={cn(
            'pointer-events-none absolute text-muted-foreground/70',
            compact ? 'top-0.5 right-0.5 size-2.5' : 'top-1 right-1 size-3',
          )}
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-0.5">
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
            compact ? 'text-lg' : 'text-xl landscape-mobile:text-lg',
          )}
        >
          {displayValue ?? value}
        </span>
      </div>
      {phaseLabel ? (
        <span
          className={cn(
            'max-w-full shrink-0 truncate px-0.5 text-center font-semibold leading-none tracking-wide text-muted-foreground uppercase',
            compact ? 'pb-0.5 text-[7px]' : 'pb-1.5 text-[8px]',
          )}
        >
          {phaseLabel}
        </span>
      ) : null}
    </div>
  )
}
