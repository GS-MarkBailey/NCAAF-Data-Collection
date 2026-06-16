import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { GameState } from '@/types'
import { ActionLogDialogShadcn } from '@/components/shadcn/ActionLogDialogShadcn'
import { TakeControlButton } from '@/components/game/TakeControlButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface GameHeaderShadcnProps {
  game: GameState
  onToggleTakeControl: () => void
}

export function GameHeaderShadcn({
  game,
  onToggleTakeControl,
}: GameHeaderShadcnProps) {
  const { fixture, score, takeControlActive } = game

  return (
    <header className="shrink-0 safe-x">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 landscape-mobile:py-2">
        <Button
          variant="outline"
          size="icon"
          className="justify-self-start"
          render={<Link to="/fixtures" />}
        >
          <ChevronLeft />
          <span className="sr-only">Back to fixtures</span>
        </Button>

        <div className="flex min-w-0 items-center justify-center gap-2">
          <span className="truncate text-sm font-medium landscape-mobile:text-xs">
            {fixture.homeTeam}
          </span>

          {/* Card: score container · Badge: home/away values · Separator: centre divider */}
          <Card
            size="sm"
            className="flex shrink-0 flex-row items-stretch gap-0 overflow-hidden bg-black py-0 text-white [--card-spacing:0]"
          >
            <Badge
              variant="secondary"
              className="h-8 min-w-8 justify-center rounded-none border-transparent bg-transparent px-2.5 text-sm font-bold text-white"
            >
              {score.home}
            </Badge>
            <Separator orientation="vertical" className="bg-white/20" />
            <Badge
              variant="secondary"
              className="h-8 min-w-8 justify-center rounded-none border-transparent bg-transparent px-2.5 text-sm font-bold text-white"
            >
              {score.away}
            </Badge>
          </Card>

          <span className="truncate text-sm font-medium landscape-mobile:text-xs">
            {fixture.awayTeam}
          </span>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 justify-self-end">
          <ActionLogDialogShadcn fixtureId={fixture.id} />
          <TakeControlButton
            variant="shadcn"
            takeControlActive={takeControlActive}
            onToggleTakeControl={onToggleTakeControl}
          />
        </div>
      </div>
    </header>
  )
}
