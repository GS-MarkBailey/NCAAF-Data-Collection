import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { GameState } from '@/types'
import { ActionLogDialog } from '@/components/game/ActionLogDialog'
import { TakeControlButton } from '@/components/game/TakeControlButton'

interface GameHeaderProps {
  game: GameState
  onToggleTakeControl: () => void
}

export function GameHeader({ game, onToggleTakeControl }: GameHeaderProps) {
  const { fixture, score, takeControlActive } = game

  return (
    <header className="flex shrink-0 items-center gap-3 safe-x py-4 landscape-mobile:py-2">
      <Link
        to="/fixtures"
        className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[var(--color-panel-border)] bg-[var(--color-panel)] text-[var(--color-text)] shadow-[var(--shadow-panel)]"
        aria-label="Back to fixtures"
      >
        <ChevronLeft className="size-5" strokeWidth={2.5} />
      </Link>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5">
        <span className="truncate text-[13px] font-semibold text-[var(--color-text)] landscape-mobile:text-xs">
          {fixture.homeTeam}
        </span>
        <ScoreDisplay home={score.home} away={score.away} />
        <span className="truncate text-[13px] font-semibold text-[var(--color-text)] landscape-mobile:text-xs">
          {fixture.awayTeam}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <ActionLogDialog fixtureId={fixture.id} />
        <TakeControlButton
          takeControlActive={takeControlActive}
          onToggleTakeControl={onToggleTakeControl}
        />
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
