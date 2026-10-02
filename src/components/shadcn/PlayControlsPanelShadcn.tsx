import { MoveHorizontal, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
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

interface PlayControlsPanelShadcnProps {
  fixtureId: string
  layout?: 'stack' | 'column'
}

export function PlayControlsPanelShadcn({
  fixtureId,
  layout = 'column',
}: PlayControlsPanelShadcnProps) {
  const gameEnded = useAppStore((s) => s.games[fixtureId]?.gameEnded ?? false)
  const playInProgress = useAppStore(
    (s) => s.games[fixtureId]?.playInProgress ?? false,
  )
  const playYardsGained = useAppStore(
    (s) => s.games[fixtureId]?.playYardsGained ?? 0,
  )
  const snapPlay = useAppStore((s) => s.snapPlay)
  const endPlay = useAppStore((s) => s.endPlay)
  const adjustYards = useAppStore((s) => s.adjustYards)

  const showSnap = useFeatureFlag('playControls.snap')
  const showEndPlay = useFeatureFlag('playControls.endPlay')
  const showYardAdjust = useFeatureFlag('playControls.yardAdjust')

  const stacked = layout === 'stack'
  const disabled = gameEnded
  const canSnap = !disabled && !playInProgress
  const canEndOrAdjust = !disabled && playInProgress

  const yardsLabel =
    playYardsGained === 0
      ? '0 YARDS'
      : `${playYardsGained > 0 ? '+' : ''}${playYardsGained} YARDS`

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
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2">
        {!showSnap && !showEndPlay && !showYardAdjust ? (
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
              <div className="flex min-h-0 flex-[1.2] flex-col gap-2 rounded-lg border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    <MoveHorizontal className="size-3.5" aria-hidden />
                    Yards
                  </span>
                  <span
                    className={cn(
                      'text-xs font-bold tabular-nums',
                      playInProgress
                        ? 'text-foreground'
                        : 'text-muted-foreground',
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
                      disabled={!canEndOrAdjust}
                      aria-label={`${delta > 0 ? 'Gain' : 'Lose'} ${Math.abs(delta)} ${
                        Math.abs(delta) === 1 ? 'yard' : 'yards'
                      }`}
                      className={cn(
                        'h-full min-h-10 px-1 text-sm font-bold tabular-nums',
                        delta > 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-700 dark:text-red-400',
                      )}
                      onClick={() => adjustYards(fixtureId, delta)}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
