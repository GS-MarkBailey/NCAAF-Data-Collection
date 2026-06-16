import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { GameHeader } from '@/components/game/GameHeader'
import { ScoreboardPanel } from '@/components/game/ScoreboardPanel'
import { PlayByPlayPanel } from '@/components/game/PlayByPlayPanel'
import { RiskManagementPanel } from '@/components/game/RiskManagementPanel'
import { GamePageShadcn } from '@/pages/shadcn/GamePageShadcn'
import { useClockTicker } from '@/hooks/useClockTicker'
import { useAppStore } from '@/store/gameStore'
import { useUiStore } from '@/store/uiStore'

export function GamePage() {
  const variant = useUiStore((s) => s.variant)

  if (variant === 'shadcn') {
    return <GamePageShadcn />
  }

  return <GamePageCustom />
}

function GamePageCustom() {
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
      <div className="flex h-dvh items-center justify-center bg-[var(--color-app-bg)]">
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      </div>
    )
  }

  const takeControl = game.takeControlActive

  return (
    <div className="flex h-dvh flex-col bg-[var(--color-app-bg)] safe-t safe-b">
      <GameHeader
        game={game}
        onToggleTakeControl={() => toggleTakeControl(fixtureId)}
      />

      <div className="flex min-h-0 flex-1 flex-col safe-l safe-r pb-0 landscape-mobile:pb-2">
        <div
          className={cn(
            'grid min-h-0 flex-1 grid-cols-1 gap-3 rounded-[var(--radius-panel)] border-[3px] p-3 transition-colors landscape-mobile:grid-cols-3 landscape-mobile:gap-3 landscape-mobile:p-3',
            takeControl
              ? 'border-[var(--color-danger-border)] bg-[var(--color-danger-bg)]'
              : 'border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-[var(--shadow-panel)]',
          )}
        >
          <ScoreboardPanel fixtureId={fixtureId} />
          <PlayByPlayPanel game={game} />
          <RiskManagementPanel
            game={game}
            onToggleRisk={(risk) => toggleRisk(fixtureId, risk)}
          />
        </div>
      </div>
    </div>
  )
}
