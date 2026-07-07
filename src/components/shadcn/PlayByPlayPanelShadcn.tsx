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
    <Card size="compact" className="flex min-h-0 flex-1 flex-col border border-border ring-0 md:border-0 md:ring-1">
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
      className={cn(
        'relative gap-0 p-2',
        pulsing && 'push-data-pulse',
      )}
      style={{ '--push-pulse-end': 'var(--card)' } as CSSProperties}
    >
      <Badge className="absolute right-2.5 top-2 rounded-md border-transparent bg-[var(--color-time-pill)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-time-pill-text)]">
        {play.clock}
      </Badge>
      <p className="text-[13px] font-bold leading-snug">
        {downLabel(play.down)} & {play.distance}
      </p>
      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
        Ball on {play.ballOn}
      </p>
      <p className="w-full text-xs leading-snug text-muted-foreground">
        {play.description}
      </p>
    </Card>
  )
}
