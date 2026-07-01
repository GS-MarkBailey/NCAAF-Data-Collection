import { useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

const ITEM_HEIGHT = 28
const VISIBLE_ROWS = 3
const PADDING_ROWS = Math.floor(VISIBLE_ROWS / 2)
const WHEEL_VIEWPORT_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS

export const CLOCK_MINUTE_VALUES = Array.from({ length: 16 }, (_, index) => index)
export const CLOCK_SECOND_VALUES = Array.from({ length: 60 }, (_, index) => index)

interface ClockWheelColumnProps {
  values: number[]
  value: number
  onChange: (value: number) => void
}

export function ClockWheelColumn({
  values,
  value,
  onChange,
}: ClockWheelColumnProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const settleTimerRef = useRef<number | undefined>(undefined)
  const isDraggingRef = useRef(false)

  const scrollToValue = useCallback(
    (nextValue: number, behavior: ScrollBehavior = 'auto') => {
      const scroller = scrollerRef.current
      if (!scroller) return

      const index = values.indexOf(nextValue)
      if (index < 0) return

      scroller.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior,
      })
    },
    [values],
  )

  useEffect(() => {
    scrollToValue(value)
  }, [scrollToValue, value])

  const settleSelection = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const index = Math.max(
      0,
      Math.min(values.length - 1, Math.round(scroller.scrollTop / ITEM_HEIGHT)),
    )

    scroller.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: 'smooth',
    })
    onChange(values[index]!)
  }, [onChange, values])

  const handleScroll = () => {
    window.clearTimeout(settleTimerRef.current)
    settleTimerRef.current = window.setTimeout(settleSelection, 100)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden">
      <div
        className="relative w-full max-w-[4rem] shrink-0 overflow-hidden"
        style={{ height: WHEEL_VIEWPORT_HEIGHT }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-7 -translate-y-1/2 rounded-md border-y border-border bg-muted/40" />
        <div
          ref={scrollerRef}
          className={cn(
            'h-full overflow-y-auto overscroll-y-contain scroll-smooth snap-y snap-mandatory',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          )}
          onScroll={handleScroll}
          onPointerDown={() => {
            isDraggingRef.current = true
          }}
          onPointerUp={() => {
            isDraggingRef.current = false
            settleSelection()
          }}
          onPointerLeave={() => {
            if (isDraggingRef.current) settleSelection()
          }}
          onWheel={() => {
            window.clearTimeout(settleTimerRef.current)
            settleTimerRef.current = window.setTimeout(settleSelection, 100)
          }}
        >
          <div style={{ height: ITEM_HEIGHT * PADDING_ROWS }} aria-hidden />
          {values.map((option) => {
            const selected = option === value
            return (
              <div
                key={option}
                className={cn(
                  'flex snap-center items-center justify-center tabular-nums transition-[opacity,color]',
                  selected
                    ? 'text-xl font-bold text-foreground'
                    : 'text-base text-muted-foreground/70',
                )}
                style={{ height: ITEM_HEIGHT }}
              >
                {option.toString().padStart(2, '0')}
              </div>
            )
          })}
          <div style={{ height: ITEM_HEIGHT * PADDING_ROWS }} aria-hidden />
        </div>
      </div>
    </div>
  )
}

interface ClockWheelEditorProps {
  minutes: number
  seconds: number
  onMinutesChange: (minutes: number) => void
  onSecondsChange: (seconds: number) => void
}

export function ClockWheelEditor({
  minutes,
  seconds,
  onMinutesChange,
  onSecondsChange,
}: ClockWheelEditorProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center gap-1.5 overflow-hidden px-1 py-1">
      <ClockWheelColumn
        values={CLOCK_MINUTE_VALUES}
        value={minutes}
        onChange={onMinutesChange}
      />
      <span className="shrink-0 self-center text-xl font-bold leading-none text-muted-foreground">
        :
      </span>
      <ClockWheelColumn
        values={CLOCK_SECOND_VALUES}
        value={seconds}
        onChange={onSecondsChange}
      />
    </div>
  )
}
