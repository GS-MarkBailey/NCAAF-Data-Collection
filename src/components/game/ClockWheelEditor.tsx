import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { MAX_PERIOD, MIN_PERIOD, CLOCK_EDIT_MAX_MINUTES, getClockEditSecondValues } from '@/lib/clock'

const ITEM_HEIGHT = 28

export const CLOCK_MINUTE_VALUES = Array.from({ length: 16 }, (_, index) => index)
export const CLOCK_SECOND_VALUES = Array.from({ length: 60 }, (_, index) => index)
export const CLOCK_PERIOD_VALUES = Array.from(
  { length: MAX_PERIOD - MIN_PERIOD + 1 },
  (_, index) => MIN_PERIOD + index,
)

interface ClockWheelColumnProps {
  values: number[]
  value: number
  onChange: (value: number) => void
  formatValue?: (value: number) => string
}

export function ClockWheelColumn({
  values,
  value,
  onChange,
  formatValue = (option) => option.toString().padStart(2, '0'),
}: ClockWheelColumnProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const settleTimerRef = useRef<number | undefined>(undefined)
  const isDraggingRef = useRef(false)
  const suppressSettleRef = useRef(false)
  const [edgePadding, setEdgePadding] = useState(0)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const updatePadding = () => {
      setEdgePadding(Math.max(0, (viewport.clientHeight - ITEM_HEIGHT) / 2))
    }

    updatePadding()
    const observer = new ResizeObserver(updatePadding)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const scrollToValue = useCallback(
    (nextValue: number, behavior: ScrollBehavior = 'auto') => {
      const scroller = scrollerRef.current
      if (!scroller) return

      const index = values.indexOf(nextValue)
      if (index < 0) return

      suppressSettleRef.current = true
      scroller.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior,
      })

      if (behavior === 'auto') {
        window.setTimeout(() => {
          suppressSettleRef.current = false
        }, 150)
      }
    },
    [values],
  )

  useEffect(() => {
    if (edgePadding <= 0) return
    scrollToValue(value)
  }, [edgePadding, scrollToValue, value])

  const settleSelection = useCallback((smooth = false) => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const index = Math.max(
      0,
      Math.min(values.length - 1, Math.round(scroller.scrollTop / ITEM_HEIGHT)),
    )

    scroller.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: smooth ? 'smooth' : 'auto',
    })
    onChange(values[index]!)
  }, [onChange, values])

  const handleScroll = () => {
    if (suppressSettleRef.current) return

    window.clearTimeout(settleTimerRef.current)
    settleTimerRef.current = window.setTimeout(() => settleSelection(false), 100)
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center overflow-hidden">
      <div
        ref={viewportRef}
        className="relative h-full min-h-0 w-full max-w-[4rem] overflow-hidden"
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-7 -translate-y-1/2 rounded-md border-y border-border bg-muted/40" />
        <div
          ref={scrollerRef}
          className={cn(
            'h-full overflow-y-auto overscroll-y-contain snap-y snap-mandatory',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          )}
          onScroll={handleScroll}
          onPointerDown={() => {
            isDraggingRef.current = true
          }}
          onPointerUp={() => {
            isDraggingRef.current = false
            settleSelection(true)
          }}
          onPointerLeave={() => {
            if (isDraggingRef.current) settleSelection(true)
          }}
          onWheel={() => {
            if (suppressSettleRef.current) return

            window.clearTimeout(settleTimerRef.current)
            settleTimerRef.current = window.setTimeout(() => settleSelection(false), 100)
          }}
        >
          <div style={{ height: edgePadding }} aria-hidden />
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
                {formatValue(option)}
              </div>
            )
          })}
          <div style={{ height: edgePadding }} aria-hidden />
        </div>
      </div>
    </div>
  )
}

interface ClockWheelEditorProps {
  period: number
  minutes: number
  seconds: number
  onPeriodChange: (period: number) => void
  onMinutesChange: (minutes: number) => void
  onSecondsChange: (seconds: number) => void
}

export function ClockWheelEditor({
  period,
  minutes,
  seconds,
  onPeriodChange,
  onMinutesChange,
  onSecondsChange,
}: ClockWheelEditorProps) {
  const secondValues = getClockEditSecondValues(minutes)

  const handleMinutesChange = (nextMinutes: number) => {
    onMinutesChange(nextMinutes)
    if (nextMinutes === CLOCK_EDIT_MAX_MINUTES && seconds !== 0) {
      onSecondsChange(0)
    }
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center gap-1.5 overflow-hidden px-1">
      <ClockWheelColumn
        values={CLOCK_PERIOD_VALUES}
        value={period}
        onChange={onPeriodChange}
        formatValue={(option) => option.toString()}
      />
      <span className="shrink-0 self-center text-xl font-bold leading-none text-muted-foreground">
        ·
      </span>
      <ClockWheelColumn
        values={CLOCK_MINUTE_VALUES}
        value={minutes}
        onChange={handleMinutesChange}
      />
      <span className="shrink-0 self-center text-xl font-bold leading-none text-muted-foreground">
        :
      </span>
      <ClockWheelColumn
        values={secondValues}
        value={minutes === CLOCK_EDIT_MAX_MINUTES ? 0 : seconds}
        onChange={onSecondsChange}
      />
    </div>
  )
}
