import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { FieldDirectionDialog } from '@/components/game/FieldDirectionDialog'
import { GameHeaderShadcn } from '@/components/shadcn/GameHeaderShadcn'
import { PlayByPlayPanelShadcn } from '@/components/shadcn/PlayByPlayPanelShadcn'
import { RiskManagementPanelShadcn } from '@/components/shadcn/RiskManagementPanelShadcn'
import { ScoreboardPanelShadcn } from '@/components/shadcn/ScoreboardPanelShadcn'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { cn } from '@/lib/utils'
import { useClockTicker } from '@/hooks/useClockTicker'
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

  const mobileTabs = useMemo(
    () =>
      [
        showScoreboard ? { value: 'scoreboard', label: 'Scoreboard' } : null,
        showPlayByPlay ? { value: 'plays', label: 'Plays' } : null,
        showRiskManagement ? { value: 'risks', label: 'Risks' } : null,
      ].filter(Boolean) as { value: string; label: string }[],
    [showScoreboard, showPlayByPlay, showRiskManagement],
  )

  const desktopPanelCount = [showScoreboard, showPlayByPlay, showRiskManagement].filter(
    Boolean,
  ).length

  useClockTicker(fixtureId)

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
          {mobileTabs.length > 0 ? (
            <Tabs
              defaultValue={mobileTabs[0]?.value}
              className="flex min-h-0 flex-1 flex-col md:hidden landscape-mobile:hidden"
            >
              <TabsList className="w-full">
                {mobileTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {showScoreboard ? (
                <TabsContent value="scoreboard" className="min-h-0 flex-1">
                  <ScoreboardPanelShadcn fixtureId={fixtureId} />
                </TabsContent>
              ) : null}
              {showPlayByPlay ? (
                <TabsContent value="plays" className="min-h-0 flex-1">
                  <PlayByPlayPanelShadcn game={game} />
                </TabsContent>
              ) : null}
              {showRiskManagement ? (
                <TabsContent value="risks" className="min-h-0 flex-1">
                  <RiskManagementPanelShadcn
                    game={game}
                    onToggleRisk={(risk) => toggleRisk(fixtureId, risk)}
                  />
                </TabsContent>
              ) : null}
            </Tabs>
          ) : null}

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
                <ScoreboardPanelShadcn fixtureId={fixtureId} />
              ) : null}
              {showPlayByPlay ? <PlayByPlayPanelShadcn game={game} /> : null}
              {showRiskManagement ? (
                <RiskManagementPanelShadcn
                  game={game}
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
