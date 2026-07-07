import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { FieldDirectionDialog } from '@/components/game/FieldDirectionDialog'
import { GameHeaderShadcn } from '@/components/shadcn/GameHeaderShadcn'
import { PlayByPlayPanelShadcn } from '@/components/shadcn/PlayByPlayPanelShadcn'
import { RiskManagementPanelShadcn } from '@/components/shadcn/RiskManagementPanelShadcn'
import { ScoreboardPanelShadcn } from '@/components/shadcn/ScoreboardPanelShadcn'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { cn } from '@/lib/utils'
import { useClockTicker } from '@/hooks/useClockTicker'
import { useFixtureErrorToast } from '@/hooks/useFixtureErrorToast'
import { useAppStore } from '@/store/gameStore'

export function GamePageShadcn() {
  const { fixtureId } = useParams<{ fixtureId: string }>()
  const initGame = useAppStore((s) => s.initGame)
  const game = useAppStore((s) => (fixtureId ? s.games[fixtureId] : undefined))
  const setHomeAttacksRight = useAppStore((s) => s.setHomeAttacksRight)
  const toggleTakeControl = useAppStore((s) => s.toggleTakeControl)
  const toggleRisk = useAppStore((s) => s.toggleRisk)
  const showScoreboard = useFeatureFlag('game.scoreboard')
  const showPlayByPlay = useFeatureFlag('game.playByPlay')
  const showRiskManagement = useFeatureFlag('game.riskManagement')
  const showFieldDirectionDialog = useFeatureFlag('game.fieldDirectionDialog')

  const desktopPanelCount = [showScoreboard, showPlayByPlay, showRiskManagement].filter(
    Boolean,
  ).length
  const portraitPanelCount = desktopPanelCount

  useClockTicker(fixtureId)

  useFixtureErrorToast(fixtureId, game?.homeAttacksRight)

  useEffect(() => {
    if (fixtureId) initGame(fixtureId)
  }, [fixtureId, initGame])

  useEffect(() => {
    if (
      !fixtureId ||
      !game ||
      showFieldDirectionDialog ||
      game.homeAttacksRight !== null
    ) {
      return
    }

    setHomeAttacksRight(fixtureId, true)
  }, [fixtureId, game, showFieldDirectionDialog, setHomeAttacksRight])

  if (!fixtureId || !game) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const takeControl = game.takeControlActive

  return (
    <div className="flex h-dvh flex-col bg-background safe-t safe-b">
      {showFieldDirectionDialog ? (
        <FieldDirectionDialog fixtureId={fixtureId} game={game} variant="shadcn" />
      ) : null}
      <GameHeaderShadcn
        game={game}
        onToggleTakeControl={() => toggleTakeControl(fixtureId)}
      />

      <div className="flex min-h-0 flex-1 flex-col safe-l safe-r pb-3 landscape-mobile:pb-2">
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-3 rounded-xl border-[3px] p-3 transition-colors landscape-mobile:gap-3 landscape-mobile:p-3',
            takeControl
              ? 'border-destructive bg-destructive/10'
              : 'border-border/30 bg-card',
          )}
        >
          {portraitPanelCount > 0 ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2 md:hidden landscape-mobile:hidden">
              {showScoreboard ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <ScoreboardPanelShadcn fixtureId={fixtureId} layout="stack" />
                </div>
              ) : null}
              {showPlayByPlay ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <PlayByPlayPanelShadcn game={game} />
                </div>
              ) : null}
              {showRiskManagement ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <RiskManagementPanelShadcn
                    game={game}
                    layout="stack"
                    onToggleRisk={(risk) => toggleRisk(fixtureId, risk)}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-border md:hidden landscape-mobile:hidden">
              <p className="px-4 text-center text-sm text-muted-foreground">
                All game console panels are disabled. Re-enable them in Settings →
                Features.
              </p>
            </div>
          )}

          {desktopPanelCount > 0 ? (
            <div
              className={cn(
                'hidden min-h-0 flex-1 gap-3 md:grid landscape-mobile:grid',
                desktopPanelCount === 1 && 'grid-cols-1',
                desktopPanelCount === 2 && 'grid-cols-2',
                desktopPanelCount === 3 && 'grid-cols-3',
              )}
            >
              {showScoreboard ? (
                <ScoreboardPanelShadcn fixtureId={fixtureId} layout="column" />
              ) : null}
              {showPlayByPlay ? <PlayByPlayPanelShadcn game={game} /> : null}
              {showRiskManagement ? (
                <RiskManagementPanelShadcn
                  game={game}
                  layout="column"
                  onToggleRisk={(risk) => toggleRisk(fixtureId, risk)}
                />
              ) : null}
            </div>
          ) : (
            <div className="hidden min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-border md:flex landscape-mobile:flex">
              <p className="px-4 text-center text-sm text-muted-foreground">
                All game console panels are disabled. Re-enable them in Settings →
                Features.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
