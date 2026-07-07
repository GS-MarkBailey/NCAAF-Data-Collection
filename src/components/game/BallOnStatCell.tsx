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
        'flex h-full min-h-0 flex-1 flex-col items-center justify-center border-r border-[var(--color-panel-border)] px-1 py-4 last:border-r-0 landscape-mobile:py-3',
        pulsing && 'push-data-pulse',
        shellClassName,
      )}
      style={{ '--push-pulse-end': pulseEndColor } as CSSProperties}
    >
      <span
        className={cn(
          'text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]',
          labelClassName,
        )}
      >
        BL ON
      </span>
      {inactive ? (
        <span
          className={cn(
            'mt-1 text-2xl font-bold leading-none landscape-mobile:text-xl',
            valueClassName,
          )}
        >
          {MATCH_ENDED_STAT}
        </span>
      ) : (
        <BallOnValue yardLine={yardLine} arrowSide={arrowSide} className={valueClassName} />
      )}
    </div>
  )
}

interface BallOnValueProps {
  yardLine: number
  arrowSide: BallOnArrowSide
  className?: string
}

export function BallOnValue({ yardLine, arrowSide, className }: BallOnValueProps) {
  return (
    <div
      className={cn(
        'mt-1 flex w-full min-w-0 items-center justify-center gap-[0.12em] px-0.5 text-[var(--color-text)]',
        className,
      )}
    >
      {arrowSide === 'left' && <FieldArrow direction="left" />}
      <span className="shrink-0 text-2xl font-bold leading-none text-current landscape-mobile:text-xl">
        {yardLine}
      </span>
      {arrowSide === 'right' && <FieldArrow direction="right" />}
    </div>
  )
}

function FieldArrow({ direction }: { direction: BallOnArrowSide }) {
  return (
    <svg
      viewBox="0 0 10 14"
      aria-hidden
      className="h-auto w-[clamp(0.35rem,22%,0.8rem)] shrink-0 text-current"
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
