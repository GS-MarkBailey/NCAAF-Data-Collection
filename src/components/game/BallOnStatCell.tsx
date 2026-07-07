import { type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { getBallOnDisplay, yardsFromHomeGoal, type BallOnArrowSide } from '@/lib/playSimulation'
import { MATCH_ENDED_STAT } from '@/lib/scoreboard'
import { usePushPulse } from '@/hooks/usePushPulse'

interface BallOnStatCellProps {
  ballOn: number
  offenseIsHome: boolean
  homeAttacksRight: boolean
  inactive?: boolean
  compact?: boolean
  pulseEndColor?: string
  shellClassName?: string
  labelClassName?: string
  valueClassName?: string
}

export function BallOnStatCell({
  ballOn,
  offenseIsHome,
  homeAttacksRight,
  inactive = false,
  compact = false,
  pulseEndColor = 'var(--color-panel)',
  shellClassName,
  labelClassName,
  valueClassName,
}: BallOnStatCellProps) {
  const { yardLine, arrowSide } = getBallOnDisplay(
    yardsFromHomeGoal(ballOn, offenseIsHome),
    homeAttacksRight,
  )
  const pulsing = usePushPulse(inactive ? null : ballOn)

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-1 flex-col items-center border-r border-[var(--color-panel-border)] px-1 last:border-r-0 landscape-mobile:py-3',
        compact ? 'min-h-10 shrink-0 justify-center gap-0.5 py-1' : 'justify-center gap-1 py-4 landscape-mobile:py-3',
        pulsing && 'push-data-pulse',
        shellClassName,
      )}
      style={{ '--push-pulse-end': pulseEndColor } as CSSProperties}
    >
      <span
        className={cn(
          'font-medium uppercase tracking-wide leading-none text-[var(--color-text-muted)]',
          compact ? 'text-[9px]' : 'text-[10px]',
          labelClassName,
        )}
      >
        BL ON
      </span>
      {inactive ? (
        <span
          className={cn(
            'font-bold leading-none',
            compact ? 'text-lg' : 'text-2xl landscape-mobile:text-xl',
            valueClassName,
          )}
        >
          {MATCH_ENDED_STAT}
        </span>
      ) : (
        <BallOnValue
          yardLine={yardLine}
          arrowSide={arrowSide}
          compact={compact}
          valueClassName={valueClassName}
        />
      )}
    </div>
  )
}

interface BallOnValueProps {
  yardLine: number
  arrowSide: BallOnArrowSide
  compact?: boolean
  valueClassName?: string
}

export function BallOnValue({
  yardLine,
  arrowSide,
  compact = false,
  valueClassName,
}: BallOnValueProps) {
  return (
    <div className="flex w-full min-w-0 items-center justify-center gap-[0.12em] px-0.5 text-[var(--color-text)]">
      {arrowSide === 'left' && <FieldArrow direction="left" compact={compact} />}
      <span
        className={cn(
          'shrink-0 font-bold leading-none text-current',
          compact ? 'text-lg' : 'text-2xl landscape-mobile:text-xl',
          valueClassName,
        )}
      >
        {yardLine}
      </span>
      {arrowSide === 'right' && <FieldArrow direction="right" compact={compact} />}
    </div>
  )
}

function FieldArrow({
  direction,
  compact = false,
}: {
  direction: BallOnArrowSide
  compact?: boolean
}) {
  return (
    <svg
      viewBox="0 0 10 14"
      aria-hidden
      className={cn(
        'h-auto shrink-0 text-current',
        compact
          ? 'w-[0.35rem]'
          : 'w-[clamp(0.35rem,22%,0.8rem)]',
      )}
      fill="currentColor"
    >
      {direction === 'left' ? (
        <path d="M9 1 1 7 9 13Z" />
      ) : (
        <path d="M1 1 9 7 1 13Z" />
      )}
    </svg>
  )
}
