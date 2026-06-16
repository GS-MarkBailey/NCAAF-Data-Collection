import { useEffect, useRef, type CSSProperties } from 'react'
import { List } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GameState, PlayEntry } from '@/types'
import {
  groupPlaysByQuarter,
  useActiveQuarterOnScroll,
} from '@/hooks/useActiveQuarterOnScroll'
import { useEnterPulse } from '@/hooks/usePushPulse'

interface PlayByPlayPanelProps {
  game: GameState
}

export function PlayByPlayPanel({ game }: PlayByPlayPanelProps) {
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
    <section className="panel-shell">
      <div className="panel-header">
        <List className="size-4" strokeWidth={2} />
        <h2>Play by Play</h2>
      </div>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">
            No plays recorded yet
          </p>
        ) : (
          <>
            <div
              className={cn(
                'sticky top-0 z-10 -mx-0 bg-[var(--color-panel)] px-0 py-2',
                showHeaderDivider &&
                  'border-b border-[var(--color-panel-border)]',
              )}
            >
              <p className="text-sm font-bold text-[var(--color-text)]">
                Q{activeQuarter}
              </p>
            </div>

            {grouped.map(({ quarter, plays }) => (
              <div
                key={quarter}
                ref={setSectionRef(quarter)}
                className="mb-2 scroll-mt-9"
              >
                <div className="space-y-2">
                  {plays.map((play) => (
                    <PlayCard
                      key={play.id}
                      play={play}
                      isLatest={play.id === latestPlayId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  )
}

function PlayCard({
  play,
  isLatest,
}: {
  play: PlayEntry
  isLatest?: boolean
}) {
  const pulsing = useEnterPulse(Boolean(isLatest), play.id)

  return (
    <div
      className={cn(
        'relative my-2 rounded-[10px] border border-[var(--color-panel-border)] bg-[var(--color-play-card-bg)] p-2',
        pulsing && 'push-data-pulse',
      )}
      style={
        { '--push-pulse-end': 'var(--color-play-card-bg)' } as CSSProperties
      }
    >
      <span className="absolute right-2.5 top-2 rounded-md bg-[var(--color-time-pill)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-time-pill-text)]">
        {play.clock}
      </span>
      <p className="text-[13px] font-bold leading-snug text-[var(--color-text)]">
        {play.down}
        {ordinal(play.down)} &amp; {play.distance}
      </p>
      <p className="mt-0.5 text-xs leading-snug text-[var(--color-text-secondary)]">
        Ball on {play.ballOn}
      </p>
      <p className="w-full text-xs leading-snug text-[var(--color-text-secondary)]">
        {play.description}
      </p>
    </div>
  )
}

function ordinal(n: number): string {
  if (n === 1) return 'st'
  if (n === 2) return 'nd'
  if (n === 3) return 'rd'
  return 'th'
}
