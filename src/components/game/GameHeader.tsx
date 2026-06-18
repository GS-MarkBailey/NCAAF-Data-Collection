import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { GameState } from '@/types'
import { ActionLogDialogShadcn } from '@/components/shadcn/ActionLogDialogShadcn'
import { TakeControlButton } from '@/components/game/TakeControlButton'

interface GameHeaderProps {
  game: GameState
  onToggleTakeControl: () => void
}

export function GameHeader({ game, onToggleTakeControl }: GameHeaderProps) {
  const { fixture, score, takeControlActive } = game

  return (
    <header className="relative grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 safe-x py-4 landscape-mobile:py-2">
      <Link
        to="/fixtures"
        className="z-10 flex size-10 shrink-0 items-center justify-center justify-self-start rounded-[10px] border border-[var(--color-panel-border)] bg-[var(--color-panel)] text-[var(--color-text)] shadow-[var(--shadow-panel)]"
        aria-label="Back to fixtures"
      >
        <ChevronLeft className="size-5" strokeWidth={2.5} />
      </Link>

      <div className="min-w-0" aria-hidden />

      <div className="z-10 flex shrink-0 items-center justify-end gap-2 justify-self-end">
        <ActionLogDialogShadcn fixtureId={fixture.id} />
        <TakeControlButton
          takeControlActive={takeControlActive}
          onToggleTakeControl={onToggleTakeControl}
        />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2">
        <div className="relative pointer-events-auto">
          <ScoreDisplay home={score.home} away={score.away} />
          <span className="absolute top-1/2 right-full mr-2.5 max-w-[min(11rem,34vw)] -translate-y-1/2 truncate text-right text-[13px] font-semibold text-[var(--color-text)] landscape-mobile:mr-2 landscape-mobile:text-xs">
            {fixture.homeTeam}
          </span>
          <span className="absolute top-1/2 left-full ml-2.5 max-w-[min(11rem,34vw)] -translate-y-1/2 truncate text-left text-[13px] font-semibold text-[var(--color-text)] landscape-mobile:ml-2 landscape-mobile:text-xs">
            {fixture.awayTeam}
          </span>
        </div>
      </div>
    </header>
  )
}

function ScoreDisplay({ home, away }: { home: number; away: number }) {
  return (
    <div className="flex shrink-0 items-center overflow-hidden rounded-[7px] bg-[var(--color-score-bg)] text-sm font-bold text-white landscape-mobile:text-xs">
      <span className="flex size-9 items-center justify-center landscape-mobile:size-8">
        {home}
      </span>
      <span className="h-5 w-px bg-white/20" aria-hidden />
      <span className="flex size-9 items-center justify-center landscape-mobile:size-8">
        {away}
      </span>
    </div>
  )
}
