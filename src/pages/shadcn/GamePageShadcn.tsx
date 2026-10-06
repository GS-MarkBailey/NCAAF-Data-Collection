import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { FieldDirectionDialog } from '@/components/game/FieldDirectionDialog'
import { GameHeaderShadcn } from '@/components/shadcn/GameHeaderShadcn'
import { PlayByPlayPanelShadcn } from '@/components/shadcn/PlayByPlayPanelShadcn'
import { PlayControlsPanelShadcn } from '@/components/shadcn/PlayControlsPanelShadcn'
import { RiskManagementPanelShadcn } from '@/components/shadcn/RiskManagementPanelShadcn'
import { ScoreboardPanelShadcn } from '@/components/shadcn/ScoreboardPanelShadcn'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { useDisplayResilience } from '@/components/layout/LayoutVariantSync'
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
  const showPlayControls = useFeatureFlag('game.playControls')
  const showRiskManagement = useFeatureFlag('game.riskManagement')
  const showErrorToast = useFeatureFlag('game.errorToast')
  const showFieldDirectionDialog = useFeatureFlag('game.fieldDirectionDialog')
  const displayResilience = useDisplayResilience()

  const desktopPanelCount = [
    showScoreboard,
    showPlayByPlay,
    showPlayControls,
    showRiskManagement,
  ].filter(Boolean).length
  const portraitPanelCount = desktopPanelCount

  useClockTicker(fixtureId)

  useFixtureErrorToast(
    showErrorToast ? fixtureId : undefined,
    showErrorToast ? game?.homeAttacksRight : undefined,
  )

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
      <div className="flex h-dvh items-center justify-center overflow-hidden overscroll-none bg-transparent">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const takeControl = game.takeControlActive

  return (
    <div className="flex h-dvh flex-col overflow-hidden overscroll-none bg-transparent safe-t safe-b">
      {showFieldDirectionDialog ? (
        <FieldDirectionDialog fixtureId={fixtureId} game={game} variant="shadcn" />
      ) : null}
      <GameHeaderShadcn
        game={game}
        onToggleTakeControl={() => toggleTakeControl(fixtureId)}
      />

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-3 overscroll-none safe-l safe-r pb-3 landscape-mobile:gap-3 landscape-mobile:pb-2',
          displayResilience
            ? 'layout-console-shell overflow-y-auto'
            : 'overflow-hidden',
          takeControl && 'rounded-xl border-[3px] border-destructive bg-destructive/10 p-3',
        )}
      >
        {portraitPanelCount > 0 ? (
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col gap-2 overscroll-none md:hidden landscape-mobile:hidden',
              displayResilience
                ? 'layout-console-portrait'
                : 'overflow-hidden',
            )}
          >
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
            {showPlayControls ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <PlayControlsPanelShadcn fixtureId={fixtureId} layout="stack" />
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
              desktopPanelCount >= 4 && 'grid-cols-4',
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
            {showPlayControls ? (
              <PlayControlsPanelShadcn fixtureId={fixtureId} layout="column" />
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
  )
}
