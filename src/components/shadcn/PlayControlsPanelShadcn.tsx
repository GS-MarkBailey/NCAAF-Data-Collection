import { MoveHorizontal, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getMatchStateView,
  getPlayControlCapabilities,
  matchHasAction,
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
  'adjust_yards',
  'start_period',
  'end_period',
  'start_overtime',
  'end_game',
  'toggle_clock',
])

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

  const matchView = game ? getMatchStateView(toMatchStateInput(game)) : null
  const controls = game
    ? getPlayControlCapabilities(toMatchStateInput(game))
    : {
        canSnap: false,
        canEndPlay: false,
        canAdjustYards: false,
        phase: 'pregame' as const,
      }

  const stacked = layout === 'stack'
  const playInProgress = game?.playInProgress ?? false
  const canSnap = controls.canSnap
  const canEndOrAdjust = controls.canEndPlay || controls.canAdjustYards

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

  return (
    <Card
      size="compact"
      className={cn(
        'flex min-h-0 flex-1 flex-col',
        stacked && PORTRAIT_PANEL_CLASS,
      )}
    >
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <Zap className="size-4 text-muted-foreground" />
            Play controls
          </span>
          {matchView && showMatchStateGuide ? (
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {matchView.label}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {showMatchStateGuide && matchView ? (
          <MatchStateGuideBody
            fixtureId={fixtureId}
            matchView={matchView}
            yardsLabel={yardsLabel}
            playInProgress={playInProgress}
            canAdjustYards={controls.canAdjustYards}
            onAction={runAction}
            onAdjustYards={(delta) => adjustYards(fixtureId, delta)}
          />
        ) : !showSnap && !showEndPlay && !showYardAdjust ? (
          <p className="flex flex-1 items-center justify-center px-2 text-center text-sm text-muted-foreground">
            Play controls are disabled in Settings → Features.
          </p>
        ) : (
          <>
            {showSnap || showEndPlay ? (
              <div
                className={cn(
                  'grid min-h-0 flex-1 gap-2',
                  showSnap && showEndPlay ? 'grid-cols-2' : 'grid-cols-1',
                )}
              >
                {showSnap ? (
                  <Button
                    type="button"
                    variant={playInProgress ? 'secondary' : 'default'}
                    disabled={!canSnap}
                    aria-pressed={playInProgress}
                    className={cn(
                      'h-full min-h-12 text-sm font-bold tracking-wide',
                      canSnap &&
                        'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]',
                    )}
                    onClick={() => snapPlay(fixtureId)}
                  >
                    SNAP
                  </Button>
                ) : null}
                {showEndPlay ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canEndOrAdjust}
                    className="h-full min-h-12 text-sm font-bold tracking-wide"
                    onClick={() => endPlay(fixtureId)}
                  >
                    END PLAY
                  </Button>
                ) : null}
              </div>
            ) : null}

            {showYardAdjust ? (
              <YardAdjustBlock
                yardsLabel={yardsLabel}
                playInProgress={playInProgress}
                disabled={!canEndOrAdjust}
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
  yardsLabel,
  playInProgress,
  canAdjustYards,
  onAction,
  onAdjustYards,
}: {
  fixtureId: string
  matchView: NonNullable<ReturnType<typeof getMatchStateView>>
  yardsLabel: string
  playInProgress: boolean
  canAdjustYards: boolean
  onAction: (actionId: MatchActionId) => void
  onAdjustYards: (delta: number) => void
}) {
  const showYards =
    canAdjustYards || matchHasAction(matchView, 'adjust_yards')

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
      <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
        <p className="text-xs font-semibold text-foreground">{matchView.label}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {matchView.description}
        </p>
        <p className="mt-1 text-[10px] tracking-wide text-muted-foreground uppercase">
          {matchView.seriesKind.replace('_', ' ')} · {matchView.rulesetId}
        </p>
      </div>

      <section className="flex flex-col gap-1.5">
        <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Available actions
        </h3>
        <div className="flex flex-col gap-1.5">
          {matchView.actions.map((action) => {
            const wired = WIRED_ACTIONS.has(action.id)
            const isPrimary = action.id === 'snap'
            return (
              <Button
                key={action.id}
                type="button"
                variant={isPrimary ? 'default' : 'outline'}
                disabled={!wired}
                title={action.description}
                className={cn(
                  'h-auto min-h-9 justify-start px-2.5 py-1.5 text-left text-xs font-semibold',
                  isPrimary &&
                    wired &&
                    'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]',
                )}
                onClick={() => onAction(action.id)}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate">{action.label}</span>
                  <span
                    className={cn(
                      'truncate text-[10px] font-normal',
                      isPrimary && wired
                        ? 'text-white/80'
                        : 'text-muted-foreground',
                    )}
                  >
                    {wired ? action.description : `${action.description} (not wired yet)`}
                  </span>
                </span>
              </Button>
            )
          })}
          {matchView.actions.length === 0 ? (
            <p className="px-1 text-[11px] text-muted-foreground">
              No actions in this phase.
            </p>
          ) : null}
        </div>
      </section>

      {showYards ? (
        <YardAdjustBlock
          yardsLabel={yardsLabel}
          playInProgress={playInProgress}
          disabled={!canAdjustYards}
          onAdjust={onAdjustYards}
        />
      ) : null}

      <section className="flex flex-col gap-1.5 pb-1">
        <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Collectables now
        </h3>
        <ul className="flex flex-col gap-1">
          {matchView.collectables.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-border px-2 py-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {item.label}
                </span>
                {item.required ? (
                  <span className="text-[10px] font-medium tracking-wide text-amber-700 uppercase dark:text-amber-400">
                    Required
                  </span>
                ) : (
                  <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Optional
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function YardAdjustBlock({
  yardsLabel,
  playInProgress,
  disabled,
  onAdjust,
}: {
  yardsLabel: string
  playInProgress: boolean
  disabled: boolean
  onAdjust: (delta: number) => void
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2 rounded-lg border border-border p-2">
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
      <div className="grid grid-cols-4 gap-1.5">
        {YARD_DELTAS.map((delta) => (
          <Button
            key={delta}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={`${delta > 0 ? 'Gain' : 'Lose'} ${Math.abs(delta)} ${
              Math.abs(delta) === 1 ? 'yard' : 'yards'
            }`}
            className={cn(
              'min-h-10 px-1 text-sm font-bold tabular-nums',
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
