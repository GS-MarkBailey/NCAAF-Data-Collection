import { MoveHorizontal, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getMatchStateView,
  getPlayControlCapabilities,
  toMatchStateInput,
  type MatchActionId,
} from '@/lib/football'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { useAppStore } from '@/store/gameStore'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const PORTRAIT_PANEL_CLASS = 'min-h-0 flex-1 border border-border ring-0'

const YARD_DELTAS = [1, 5, -5, -1] as const

/** Actions that already have store handlers in this build. */
const WIRED_ACTIONS = new Set<MatchActionId>([
  'snap',
  'end_play',
  'start_period',
  'end_period',
  'start_overtime',
  'end_game',
  'toggle_clock',
])

/** Short labels for big operator buttons. */
const ACTION_BUTTON_LABEL: Partial<Record<MatchActionId, string>> = {
  snap: 'SNAP',
  end_play: 'END PLAY',
  start_period: 'START PERIOD',
  end_period: 'END PERIOD',
  start_overtime: 'START OT',
  end_game: 'END GAME',
  toggle_clock: 'CLOCK',
}

function actionGridClass(count: number): string {
  if (count <= 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-2'
  if (count === 3) return 'grid-cols-3'
  return 'grid-cols-2'
}

interface PlayControlsPanelShadcnProps {
  fixtureId: string
  layout?: 'stack' | 'column'
}

export function PlayControlsPanelShadcn({
  fixtureId,
  layout = 'column',
}: PlayControlsPanelShadcnProps) {
  const game = useAppStore((s) => s.games[fixtureId])
  const playYardsGained = game?.playYardsGained ?? 0
  const snapPlay = useAppStore((s) => s.snapPlay)
  const endPlay = useAppStore((s) => s.endPlay)
  const adjustYards = useAppStore((s) => s.adjustYards)
  const startPeriod = useAppStore((s) => s.startPeriod)
  const endPeriod = useAppStore((s) => s.endPeriod)
  const startOvertime = useAppStore((s) => s.startOvertime)
  const endGame = useAppStore((s) => s.endGame)
  const toggleClock = useAppStore((s) => s.toggleClock)

  const showSnap = useFeatureFlag('playControls.snap')
  const showEndPlay = useFeatureFlag('playControls.endPlay')
  const showYardAdjust = useFeatureFlag('playControls.yardAdjust')
  const showMatchStateGuide = useFeatureFlag('playControls.matchStateGuide')

  const matchInput = game ? toMatchStateInput(game) : null
  const matchView = matchInput ? getMatchStateView(matchInput) : null
  const matchControls = matchInput
    ? getPlayControlCapabilities(matchInput)
    : null

  const stacked = layout === 'stack'
  const gameEnded = game?.gameEnded ?? false
  const playInProgress = game?.playInProgress ?? false

  const canSnap = showMatchStateGuide
    ? (matchControls?.canSnap ?? false)
    : !gameEnded && !playInProgress
  const canEndPlay = showMatchStateGuide
    ? (matchControls?.canEndPlay ?? false)
    : !gameEnded && playInProgress
  const canAdjustYards = showMatchStateGuide
    ? (matchControls?.canAdjustYards ?? false)
    : !gameEnded && playInProgress

  const yardsLabel =
    playYardsGained === 0
      ? '0 YARDS'
      : `${playYardsGained > 0 ? '+' : ''}${playYardsGained} YARDS`

  const runAction = (actionId: MatchActionId) => {
    switch (actionId) {
      case 'snap':
        snapPlay(fixtureId)
        return
      case 'end_play':
        endPlay(fixtureId)
        return
      case 'start_period':
        startPeriod(fixtureId)
        return
      case 'end_period':
        endPeriod(fixtureId)
        return
      case 'start_overtime':
        startOvertime(fixtureId)
        return
      case 'end_game':
        endGame(fixtureId)
        return
      case 'toggle_clock':
        toggleClock(fixtureId)
        return
      default:
        return
    }
  }

  const classicButtons: { id: MatchActionId; label: string; primary?: boolean }[] =
    []
  if (showSnap && canSnap) {
    classicButtons.push({ id: 'snap', label: 'SNAP', primary: true })
  }
  if (showEndPlay && canEndPlay) {
    classicButtons.push({ id: 'end_play', label: 'END PLAY' })
  }

  return (
    <Card
      size="compact"
      className={cn(
        'flex min-h-0 flex-1 flex-col',
        stacked && PORTRAIT_PANEL_CLASS,
      )}
    >
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap className="size-4 text-muted-foreground" />
          Play controls
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {showMatchStateGuide && matchView && matchControls ? (
          <MatchStateGuideBody
            matchView={matchView}
            canSnap={canSnap}
            canEndPlay={canEndPlay}
            yardsLabel={yardsLabel}
            playInProgress={playInProgress}
            canAdjustYards={canAdjustYards}
            onAction={runAction}
            onAdjustYards={(delta) => adjustYards(fixtureId, delta)}
          />
        ) : !showSnap && !showEndPlay && !showYardAdjust ? (
          <p className="flex flex-1 items-center justify-center px-2 text-center text-sm text-muted-foreground">
            Play controls are disabled in Settings → Features.
          </p>
        ) : classicButtons.length === 0 && !(showYardAdjust && canAdjustYards) ? (
          <p className="flex flex-1 items-center justify-center px-2 text-center text-sm text-muted-foreground">
            {gameEnded ? 'Match ended' : 'No play actions available'}
          </p>
        ) : (
          <>
            {classicButtons.length > 0 ? (
              <ActionButtonGrid
                buttons={classicButtons}
                onAction={runAction}
              />
            ) : null}

            {showYardAdjust && canAdjustYards ? (
              <YardAdjustBlock
                yardsLabel={yardsLabel}
                playInProgress={playInProgress}
                onAdjust={(delta) => adjustYards(fixtureId, delta)}
              />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MatchStateGuideBody({
  matchView,
  canSnap,
  canEndPlay,
  yardsLabel,
  playInProgress,
  canAdjustYards,
  onAction,
  onAdjustYards,
}: {
  matchView: NonNullable<ReturnType<typeof getMatchStateView>>
  canSnap: boolean
  canEndPlay: boolean
  yardsLabel: string
  playInProgress: boolean
  canAdjustYards: boolean
  onAction: (actionId: MatchActionId) => void
  onAdjustYards: (delta: number) => void
}) {
  const buttons: {
    id: MatchActionId
    label: string
    primary?: boolean
    title?: string
  }[] = []

  if (canSnap) {
    buttons.push({
      id: 'snap',
      label: 'SNAP',
      primary: true,
      title: 'Start collecting the live scrimmage play',
    })
  }
  if (canEndPlay) {
    buttons.push({
      id: 'end_play',
      label: 'END PLAY',
      title: 'Finalize down / distance / possession',
    })
  }

  for (const action of matchView.actions) {
    if (
      action.id === 'snap' ||
      action.id === 'end_play' ||
      action.id === 'adjust_yards' ||
      !WIRED_ACTIONS.has(action.id)
    ) {
      continue
    }
    if (buttons.some((button) => button.id === action.id)) continue
    buttons.push({
      id: action.id,
      label: ACTION_BUTTON_LABEL[action.id] ?? action.label.toUpperCase(),
      title: action.description,
    })
  }

  if (buttons.length === 0 && !canAdjustYards) {
    return (
      <p className="flex flex-1 items-center justify-center px-2 text-center text-sm text-muted-foreground">
        No play actions available
      </p>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {buttons.length > 0 ? (
        <ActionButtonGrid buttons={buttons} onAction={onAction} />
      ) : null}

      {canAdjustYards ? (
        <YardAdjustBlock
          yardsLabel={yardsLabel}
          playInProgress={playInProgress}
          onAdjust={onAdjustYards}
        />
      ) : null}
    </div>
  )
}

function ActionButtonGrid({
  buttons,
  onAction,
}: {
  buttons: {
    id: MatchActionId
    label: string
    primary?: boolean
    title?: string
  }[]
  onAction: (actionId: MatchActionId) => void
}) {
  return (
    <div
      className={cn(
        'grid min-h-0 flex-1 gap-2',
        actionGridClass(buttons.length),
      )}
    >
      {buttons.map((button) => (
        <Button
          key={button.id}
          type="button"
          variant={button.primary ? 'default' : 'outline'}
          title={button.title}
          className={cn(
            'h-full min-h-12 text-sm font-bold tracking-wide',
            button.primary &&
              'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]',
          )}
          onClick={() => onAction(button.id)}
        >
          {button.label}
        </Button>
      ))}
    </div>
  )
}

function YardAdjustBlock({
  yardsLabel,
  playInProgress,
  onAdjust,
}: {
  yardsLabel: string
  playInProgress: boolean
  onAdjust: (delta: number) => void
}) {
  return (
    <div className="flex min-h-0 flex-[1.2] flex-col gap-2 rounded-lg border border-border p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          <MoveHorizontal className="size-3.5" aria-hidden />
          Yards
        </span>
        <span
          className={cn(
            'text-xs font-bold tabular-nums',
            playInProgress ? 'text-foreground' : 'text-muted-foreground',
          )}
          aria-live="polite"
        >
          {yardsLabel}
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-4 gap-1.5">
        {YARD_DELTAS.map((delta) => (
          <Button
            key={delta}
            type="button"
            variant="outline"
            aria-label={`${delta > 0 ? 'Gain' : 'Lose'} ${Math.abs(delta)} ${
              Math.abs(delta) === 1 ? 'yard' : 'yards'
            }`}
            className={cn(
              'h-full min-h-10 px-1 text-sm font-bold tabular-nums',
              delta > 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-700 dark:text-red-400',
            )}
            onClick={() => onAdjust(delta)}
          >
            {delta > 0 ? `+${delta}` : delta}
          </Button>
        ))}
      </div>
    </div>
  )
}
