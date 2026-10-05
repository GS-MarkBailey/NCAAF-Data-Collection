import { MoveHorizontal, Undo2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  OPERATOR_PRIMARY_SURFACE,
  OPERATOR_SECONDARY_SURFACE,
  operatorButtonTextClass,
} from '@/lib/operatorChrome'
import {
  canUndoPlayAction,
  getMatchStateView,
  getPlayCollectionView,
  getPlayControlCapabilities,
  toMatchStateInput,
  type CollectionButtonEmphasis,
  type MatchActionId,
  type PlayCollectionButton,
} from '@/lib/football'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { useAppStore } from '@/store/gameStore'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const PORTRAIT_PANEL_CLASS = 'min-h-0 flex-1 border border-border ring-0'

const YARD_DELTAS = [1, 5, -5, -1] as const

/** Column count for the non–full-width cells in a step (max 5 in current NCAA flow). */
function actionGridClass(count: number): string {
  if (count <= 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-2'
  if (count === 3) return 'grid-cols-3'
  // 4–5: 2×2 (+ optional full-width primary above)
  return 'grid-cols-2'
}

/** How many grid rows the layout needs (full-width buttons each take a row). */
function actionGridRowCount(buttons: readonly ControlButton[]): number {
  const fullWidth = buttons.filter((b) => b.wide).length
  const cells = buttons.length - fullWidth
  if (cells <= 0) return Math.max(fullWidth, 1)
  const cols = cells <= 1 ? 1 : cells === 3 ? 3 : 2
  return fullWidth + Math.ceil(cells / cols)
}

interface ControlButton {
  id: string
  label: string
  emphasis?: CollectionButtonEmphasis
  title?: string
  /** Span full row when this is clearly the dominant option. */
  wide?: boolean
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
  const selectPlayCollectionOption = useAppStore(
    (s) => s.selectPlayCollectionOption,
  )
  const undoPlayControl = useAppStore((s) => s.undoPlayControl)
  const startPeriod = useAppStore((s) => s.startPeriod)
  const canUndo = canUndoPlayAction(game)

  const showSnap = useFeatureFlag('playControls.snap')
  const showEndPlay = useFeatureFlag('playControls.endPlay')
  const showYardAdjust = useFeatureFlag('playControls.yardAdjust')
  const showMatchStateGuide = useFeatureFlag('playControls.matchStateGuide')

  const matchInput = game ? toMatchStateInput(game) : null
  const matchView = matchInput ? getMatchStateView(matchInput) : null
  const matchControls = matchInput
    ? getPlayControlCapabilities(matchInput)
    : null
  const collectionView = getPlayCollectionView(
    game?.playCollectionStep,
    game?.playCollectionPath ?? [],
  )

  const stacked = layout === 'stack'
  const gameEnded = game?.gameEnded ?? false
  const playInProgress = game?.playInProgress ?? false
  const inLivePlay = !gameEnded && playInProgress
  const gameStarted = game?.gameStarted ?? false

  const canKickOff = showMatchStateGuide
    ? (matchControls?.canKickOff ?? false)
    : false

  const canSnap = showMatchStateGuide
    ? (matchControls?.canSnap ?? false)
    : !gameEnded && gameStarted && !playInProgress

  // Progressive collection gates END PLAY; yards stay available to adjust anytime.
  const canEndPlay = showMatchStateGuide
    ? inLivePlay
      ? collectionView.canEndPlay
      : Boolean(matchControls?.canEndPlay)
    : showEndPlay && inLivePlay

  const canAdjustYards = showYardAdjust && !gameEnded

  const yardsLabel =
    playYardsGained === 0
      ? '0 YARDS'
      : `${playYardsGained > 0 ? '+' : ''}${playYardsGained} YARDS`

  const runAction = (actionId: MatchActionId) => {
    switch (actionId) {
      case 'kickoff':
        startPeriod(fixtureId)
        return
      case 'snap':
        snapPlay(fixtureId)
        return
      case 'end_play':
        endPlay(fixtureId)
        return
      default:
        return
    }
  }

  const classicButtons: ControlButton[] = []
  if (showSnap && canSnap) {
    classicButtons.push({
      id: 'snap',
      label: 'SNAP',
      emphasis: 'primary',
      wide: true,
    })
  }
  if (showEndPlay && canEndPlay) {
    classicButtons.push({
      id: 'end_play',
      label: 'END PLAY',
      emphasis: 'secondary',
    })
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
        <CardAction>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!canUndo}
            title="Undo last play-control action"
            aria-label="Undo last play-control action"
            className={cn(
              'h-7 gap-1 px-2 text-xs font-medium',
              OPERATOR_SECONDARY_SURFACE,
            )}
            onClick={() => undoPlayControl(fixtureId)}
          >
            <Undo2 className="size-3.5" aria-hidden />
            Undo
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {showMatchStateGuide && matchView && matchControls ? (
          <MatchStateGuideBody
            matchView={matchView}
            canKickOff={canKickOff}
            canSnap={canSnap}
            canEndPlay={canEndPlay}
            yardsLabel={yardsLabel}
            playInProgress={playInProgress}
            canAdjustYards={canAdjustYards}
            collectionButtons={collectionView.buttons}
            stacked={stacked}
            onAction={runAction}
            onCollectionOption={(optionId) =>
              selectPlayCollectionOption(fixtureId, optionId)
            }
            onAdjustYards={(delta) => adjustYards(fixtureId, delta)}
          />
        ) : !showSnap && !showEndPlay && !showYardAdjust ? (
          <p className="flex flex-1 items-center justify-center px-2 text-center text-sm text-muted-foreground">
            Play controls are disabled in Settings → Features.
          </p>
        ) : classicButtons.length === 0 && !(showYardAdjust && canAdjustYards) ? (
          <p className="flex flex-1 items-center justify-center px-2 text-center text-sm text-muted-foreground">
            {gameEnded
              ? 'Match ended'
              : !gameStarted
                ? 'Kick off from Match-state guide to begin'
                : 'No play actions available'}
          </p>
        ) : (
          <>
            {classicButtons.length > 0 ? (
              <ActionButtonGrid
                buttons={classicButtons}
                stacked={stacked}
                onAction={(id) => runAction(id as MatchActionId)}
              />
            ) : null}

            {showYardAdjust && canAdjustYards ? (
              <YardAdjustBlock
                yardsLabel={yardsLabel}
                playInProgress={playInProgress}
                shareHeight={classicButtons.length > 0}
                stacked={stacked}
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
  canKickOff,
  canSnap,
  canEndPlay,
  yardsLabel,
  playInProgress,
  canAdjustYards,
  collectionButtons,
  stacked,
  onAction,
  onCollectionOption,
  onAdjustYards,
}: {
  matchView: NonNullable<ReturnType<typeof getMatchStateView>>
  canKickOff: boolean
  canSnap: boolean
  canEndPlay: boolean
  yardsLabel: string
  playInProgress: boolean
  canAdjustYards: boolean
  collectionButtons: PlayCollectionButton[]
  stacked: boolean
  onAction: (actionId: MatchActionId) => void
  onCollectionOption: (optionId: string) => void
  onAdjustYards: (delta: number) => void
}) {
  const buttons: ControlButton[] = []

  if (canKickOff || matchView.phase === 'pregame') {
    if (canKickOff) {
      buttons.push({
        id: 'kickoff',
        label: 'KICK OFF',
        emphasis: 'primary',
        wide: true,
        title: 'Kick off — then collect Return / Touchback / …',
      })
    }
  } else if (playInProgress) {
    const maxLikelihood = Math.max(
      0,
      ...collectionButtons.map((option) => option.likelihood),
    )
    for (const option of collectionButtons) {
      buttons.push({
        id: `collect:${option.id}`,
        label: option.label,
        emphasis: option.emphasis,
        wide:
          option.emphasis === 'primary' &&
          option.likelihood >= maxLikelihood * 0.85 &&
          collectionButtons.length >= 3,
        title: option.catalogId,
      })
    }
    if (canEndPlay) {
      buttons.push({
        id: 'end_play',
        label: 'END PLAY',
        emphasis: 'secondary',
        title: 'Finalize down / distance / possession',
      })
    }
  } else {
    if (canSnap) {
      buttons.push({
        id: 'snap',
        label: 'SNAP',
        emphasis: 'primary',
        wide: true,
        title: 'Start collecting the live scrimmage play',
      })
    }
    if (canEndPlay) {
      buttons.push({
        id: 'end_play',
        label: 'END PLAY',
        emphasis: 'secondary',
        title: 'Finalize down / distance / possession',
      })
    }
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
        <ActionButtonGrid
          buttons={buttons}
          stacked={stacked}
          onAction={(id) => {
            if (id.startsWith('collect:')) {
              onCollectionOption(id.slice('collect:'.length))
              return
            }
            onAction(id as MatchActionId)
          }}
        />
      ) : null}

      {canAdjustYards ? (
        <YardAdjustBlock
          yardsLabel={yardsLabel}
          playInProgress={playInProgress}
          shareHeight={buttons.length > 0}
          stacked={stacked}
          onAdjust={onAdjustYards}
        />
      ) : null}
    </div>
  )
}

function ActionButtonGrid({
  buttons,
  stacked,
  onAction,
}: {
  buttons: ControlButton[]
  stacked: boolean
  onAction: (id: string) => void
}) {
  const fullWidthCount = buttons.filter((b) => b.wide).length
  const cellCount = buttons.length - fullWidthCount
  // When some buttons are full-row, size the remaining row by how many share it.
  const colsClass =
    fullWidthCount > 0 && cellCount > 0
      ? actionGridClass(cellCount)
      : actionGridClass(buttons.length)
  const rowCount = actionGridRowCount(buttons)

  return (
    <div
      className={cn(
        'grid min-h-0 w-full flex-1 gap-1.5 overflow-hidden',
        colsClass,
      )}
      style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
    >
      {buttons.map((button) => {
        const emphasis = button.emphasis ?? 'secondary'
        return (
          <Button
            key={button.id}
            type="button"
            variant={emphasis === 'primary' ? 'default' : 'secondary'}
            title={button.title}
            className={cn(
              // Override default button h-8 / shrink-0 so cells can share height.
              'h-full min-h-0 w-full min-w-0 shrink overflow-hidden whitespace-normal px-1.5 text-center',
              operatorButtonTextClass(stacked),
              button.wide && 'col-span-full',
              emphasis === 'primary'
                ? OPERATOR_PRIMARY_SURFACE
                : OPERATOR_SECONDARY_SURFACE,
              emphasis === 'tertiary' && 'text-muted-foreground',
            )}
            onClick={() => onAction(button.id)}
          >
            {button.label}
          </Button>
        )
      })}
    </div>
  )
}

function YardAdjustBlock({
  yardsLabel,
  playInProgress,
  shareHeight = true,
  stacked = false,
  onAdjust,
}: {
  yardsLabel: string
  playInProgress: boolean
  /** When true (actions above), yards take ~⅓ of panel height. */
  shareHeight?: boolean
  stacked?: boolean
  onAdjust: (delta: number) => void
}) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-col gap-2 rounded-lg border border-border p-2',
        shareHeight ? 'h-[33%] shrink-0 grow-0' : 'flex-1',
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          <MoveHorizontal className="size-3.5" aria-hidden />
          Yards
        </span>
        <span
          className={cn(
            'text-xs font-medium tabular-nums',
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
            variant="secondary"
            aria-label={`${delta > 0 ? 'Gain' : 'Lose'} ${Math.abs(delta)} ${
              Math.abs(delta) === 1 ? 'yard' : 'yards'
            }`}
            className={cn(
              'h-full min-h-0 w-full px-1 tabular-nums',
              operatorButtonTextClass(stacked),
              OPERATOR_SECONDARY_SURFACE,
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
