import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { GameHeaderShadcn } from '@/components/shadcn/GameHeaderShadcn'
import { PlayByPlayPanelShadcn } from '@/components/shadcn/PlayByPlayPanelShadcn'
import { RiskManagementPanelShadcn } from '@/components/shadcn/RiskManagementPanelShadcn'
import { ScoreboardPanelShadcn } from '@/components/shadcn/ScoreboardPanelShadcn'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useClockTicker } from '@/hooks/useClockTicker'
import { useAppStore } from '@/store/gameStore'

export function GamePageShadcn() {
  const { fixtureId } = useParams<{ fixtureId: string }>()
  const initGame = useAppStore((s) => s.initGame)
  const game = useAppStore((s) => (fixtureId ? s.games[fixtureId] : undefined))
  const toggleTakeControl = useAppStore((s) => s.toggleTakeControl)
  const toggleRisk = useAppStore((s) => s.toggleRisk)

  useClockTicker(fixtureId)

  useEffect(() => {
    if (fixtureId) initGame(fixtureId)
  }, [fixtureId, initGame])

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
          <Tabs
            defaultValue="scoreboard"
            className="flex min-h-0 flex-1 flex-col landscape-mobile:hidden"
          >
            <TabsList className="w-full">
              <TabsTrigger value="scoreboard" className="flex-1">
                Scoreboard
              </TabsTrigger>
              <TabsTrigger value="plays" className="flex-1">
                Plays
              </TabsTrigger>
              <TabsTrigger value="risks" className="flex-1">
                Risks
              </TabsTrigger>
            </TabsList>
            <TabsContent value="scoreboard" className="min-h-0 flex-1">
              <ScoreboardPanelShadcn fixtureId={fixtureId} />
            </TabsContent>
            <TabsContent value="plays" className="min-h-0 flex-1">
              <PlayByPlayPanelShadcn game={game} />
            </TabsContent>
            <TabsContent value="risks" className="min-h-0 flex-1">
              <RiskManagementPanelShadcn
                game={game}
                onToggleRisk={(risk) => toggleRisk(fixtureId, risk)}
              />
            </TabsContent>
          </Tabs>

          <div className="hidden min-h-0 flex-1 grid-cols-3 gap-3 landscape-mobile:grid">
            <ScoreboardPanelShadcn fixtureId={fixtureId} />
            <PlayByPlayPanelShadcn game={game} />
            <RiskManagementPanelShadcn
              game={game}
              onToggleRisk={(risk) => toggleRisk(fixtureId, risk)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
