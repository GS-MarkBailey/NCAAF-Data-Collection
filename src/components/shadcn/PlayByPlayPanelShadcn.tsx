import { type CSSProperties, useEffect, useRef } from 'react'
import { List } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GameState, PlayEntry } from '@/types'
import { downLabel } from '@/lib/format'
import {
  groupPlaysByQuarter,
  useActiveQuarterOnScroll,
} from '@/hooks/useActiveQuarterOnScroll'
import { useEnterPulse } from '@/hooks/usePushPulse'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface PlayByPlayPanelShadcnProps {
  game: GameState
}

export function PlayByPlayPanelShadcn({ game }: PlayByPlayPanelShadcnProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const grouped = groupPlaysByQuarter(game.plays)
  const quarters = grouped.map(({ quarter }) => quarter)
  const { activeQuarter, setSectionRef, showHeaderDivider } =
    useActiveQuarterOnScroll(quarters, scrollRef)

  const playCount = game.plays.length
  const prevPlayCount = useRef(playCount)

  useEffect(() => {
    const container = scrollRef.current
    if (!container || playCount <= prevPlayCount.current) {
      prevPlayCount.current = playCount
      return
    }
    prevPlayCount.current = playCount
    if (container.scrollTop < 48) {
      container.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [playCount])

  const latestPlayId = game.plays.at(-1)?.id

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm">
          <List className="size-4 text-muted-foreground" />
          Play by Play
        </CardTitle>
      </CardHeader>
      <CardContent
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-y-auto"
      >
        {grouped.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No plays recorded yet
          </p>
        ) : (
          <>
            <div
              className={cn(
                'sticky top-0 z-10 -mx-(--card-spacing) bg-card px-(--card-spacing) py-2',
                showHeaderDivider && 'border-b border-border',
              )}
            >
              <p className="text-sm font-semibold">Quarter {activeQuarter}</p>
            </div>

            <div className="pt-2">
              {grouped.map(({ quarter, plays }, groupIndex) => (
                <div
                  key={quarter}
                  ref={setSectionRef(quarter)}
                  className="scroll-mt-9"
                >
                  {groupIndex > 0 && <Separator className="my-4" />}
                  <div className="space-y-3">
                    {plays.map((play) => (
                      <PlayCardShadcn
                        key={play.id}
                        play={play}
                        isLatest={play.id === latestPlayId}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PlayCardShadcn({
  play,
  isLatest,
}: {
  play: PlayEntry
  isLatest?: boolean
}) {
  const pulsing = useEnterPulse(Boolean(isLatest), play.id)

  return (
    <Card
      size="sm"
      className={cn(pulsing && 'push-data-pulse')}
      style={{ '--push-pulse-end': 'var(--card)' } as CSSProperties}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xs">
            {downLabel(play.down)} & {play.distance}
          </CardTitle>
          <Badge className="rounded-md border-transparent bg-[var(--color-time-pill)] text-[11px] font-semibold text-[var(--color-time-pill-text)]">
            {play.clock}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Ball on {play.ballOn}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-[8px]">{play.description}</p>
      </CardContent>
    </Card>
  )
}
