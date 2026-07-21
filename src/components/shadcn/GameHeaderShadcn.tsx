import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { GameState } from '@/types'
import { ActionLogDialogShadcn } from '@/components/shadcn/ActionLogDialogShadcn'
import { ConnectionStatusChip } from '@/components/shadcn/ConnectionStatusChip'
import { ProfileDialogShadcn } from '@/components/shadcn/ProfileDialogShadcn'
import { FeatureGate } from '@/components/game/FeatureGate'
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
      <div className="flex flex-col gap-2.5 py-3 md:hidden landscape-mobile:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              render={<Link to="/fixtures" />}
            >
              <ChevronLeft />
              <span className="sr-only">Back to fixtures</span>
            </Button>
            <FeatureGate flag="header.connectionStatus">
              <ConnectionStatusChip />
            </FeatureGate>
          </div>

          <div className="layout-header-actions flex shrink-0 items-center gap-2">
            <FeatureGate flag="header.settings">
              <ActionLogDialogShadcn fixtureId={fixture.id} />
            </FeatureGate>
            <ProfileDialogShadcn />
            <FeatureGate flag="header.takeControl">
              <TakeControlButton
                variant="shadcn"
                takeControlActive={takeControlActive}
                onToggleTakeControl={onToggleTakeControl}
              />
            </FeatureGate>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-0.5">
          <span className="truncate text-right text-sm font-medium leading-tight">
            {fixture.homeTeam}
          </span>
          <ScoreDisplay score={score} />
          <span className="truncate text-left text-sm font-medium leading-tight">
            {fixture.awayTeam}
          </span>
        </div>
      </div>

      <div className="relative hidden grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 py-3 md:grid landscape-mobile:grid landscape-mobile:gap-1.5 landscape-mobile:py-2">
        <div className="z-10 flex shrink-0 items-center gap-2 justify-self-start">
          <Button
            variant="outline"
            size="icon"
            className="justify-self-start"
            render={<Link to="/fixtures" />}
          >
            <ChevronLeft />
            <span className="sr-only">Back to fixtures</span>
          </Button>
          <FeatureGate flag="header.connectionStatus">
            <ConnectionStatusChip />
          </FeatureGate>
        </div>

        <span
          className="min-w-0 truncate text-right text-sm font-medium landscape-mobile:text-xs"
          title={fixture.homeTeam}
        >
          {fixture.homeTeam}
        </span>

        <ScoreDisplay score={score} />

        <span
          className="min-w-0 truncate text-left text-sm font-medium landscape-mobile:text-xs"
          title={fixture.awayTeam}
        >
          {fixture.awayTeam}
        </span>

        <div className="layout-header-actions z-10 flex shrink-0 items-center justify-end gap-2 justify-self-end">
          <FeatureGate flag="header.settings">
            <ActionLogDialogShadcn fixtureId={fixture.id} />
          </FeatureGate>
          <ProfileDialogShadcn />
          <FeatureGate flag="header.takeControl">
            <TakeControlButton
              variant="shadcn"
              takeControlActive={takeControlActive}
              onToggleTakeControl={onToggleTakeControl}
            />
          </FeatureGate>
        </div>
      </div>
    </header>
  )
}

function ScoreDisplay({ score }: { score: { home: number; away: number } }) {
  return (
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
  )
}
