import { type CSSProperties } from 'react'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getBallOnDisplay,
  yardsFromHomeGoal,
  type BallOnArrowSide,
  type FootballCode,
} from '@/lib/football'
import { MATCH_ENDED_STAT } from '@/lib/scoreboard'
import { usePushPulse } from '@/hooks/usePushPulse'

interface BallOnStatCellProps {
  ballOn: number
  offenseIsHome: boolean
  homeAttacksRight: boolean
  inactive?: boolean
  compact?: boolean
  showArrow?: boolean
  interactive?: boolean
  showEditIcon?: boolean
  onClick?: () => void
  ariaLabel?: string
  pulseEndColor?: string
  shellClassName?: string
  labelClassName?: string
  valueClassName?: string
  rulesetId?: FootballCode
}

export function BallOnStatCell({
  ballOn,
  offenseIsHome,
  homeAttacksRight,
  inactive = false,
  compact = false,
  showArrow = true,
  interactive = false,
  showEditIcon = false,
  onClick,
  ariaLabel,
  pulseEndColor = 'var(--color-panel)',
  shellClassName,
  labelClassName,
  valueClassName,
  rulesetId,
}: BallOnStatCellProps) {
  const { yardLine, arrowSide } = getBallOnDisplay(
    yardsFromHomeGoal(ballOn, offenseIsHome, rulesetId),
    homeAttacksRight,
    rulesetId,
  )
  const pulsing = usePushPulse(inactive ? null : ballOn)

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        'relative flex h-full min-h-0 flex-1 flex-col items-center border-r border-[var(--color-panel-border)] px-1 last:border-r-0',
        compact
          ? 'min-h-10 shrink-0 justify-center gap-0.5 py-1'
          : 'justify-center gap-0.5 py-2 landscape-mobile:py-2',
        pulsing && 'push-data-pulse',
        interactive &&
          'cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted/70',
        shellClassName,
      )}
      style={{ '--push-pulse-end': pulseEndColor } as CSSProperties}
    >
      {showEditIcon ? (
        <Pencil
          aria-hidden
          className={cn(
            'pointer-events-none absolute text-muted-foreground/70',
            compact ? 'top-0.5 right-0.5 size-2.5' : 'top-1.5 right-1.5 size-3',
          )}
        />
      ) : null}
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
          showArrow={showArrow}
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
  showArrow?: boolean
  valueClassName?: string
}

export function BallOnValue({
  yardLine,
  arrowSide,
  compact = false,
  showArrow = true,
  valueClassName,
}: BallOnValueProps) {
  return (
    <div className="flex w-full min-w-0 items-center justify-center gap-[0.12em] px-0.5 text-[var(--color-text)]">
      {showArrow && arrowSide === 'left' ? (
        <FieldArrow direction="left" compact={compact} />
      ) : null}
      <span
        className={cn(
          'shrink-0 font-bold leading-none text-current',
          compact ? 'text-lg' : 'text-2xl landscape-mobile:text-xl',
          valueClassName,
        )}
      >
        {yardLine}
      </span>
      {showArrow && arrowSide === 'right' ? (
        <FieldArrow direction="right" compact={compact} />
      ) : null}
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
