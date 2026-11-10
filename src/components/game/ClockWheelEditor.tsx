import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  CLOCK_EDIT_MAX_MINUTES,
  formatPeriodLabel,
  getClockEditSecondValues,
  MIN_PERIOD,
} from '@/lib/clock'

const ITEM_HEIGHT = 28
const INITIAL_SCROLL_SUPPRESS_MS = 400
/** Visible wheel height: selected row plus one above and below. */
export const CLOCK_WHEEL_VIEWPORT_HEIGHT = ITEM_HEIGHT * 3

export const CLOCK_MINUTE_VALUES = Array.from({ length: 16 }, (_, index) => index)
export const CLOCK_SECOND_VALUES = Array.from({ length: 60 }, (_, index) => index)
/** Q1–Q4 plus OT…OT12 — enough for the period wheel without a huge list. */
export const CLOCK_PERIOD_WHEEL_MAX = 16
export const CLOCK_PERIOD_VALUES = Array.from(
  { length: CLOCK_PERIOD_WHEEL_MAX - MIN_PERIOD + 1 },
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
  const userInteractedRef = useRef(false)
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
    (nextValue: number) => {
      const scroller = scrollerRef.current
      if (!scroller) return false

      const index = values.indexOf(nextValue)
      if (index < 0) return false

      const top = index * ITEM_HEIGHT
      suppressSettleRef.current = true
      scroller.scrollTop = top

      window.setTimeout(() => {
        suppressSettleRef.current = false
      }, INITIAL_SCROLL_SUPPRESS_MS)

      return true
    },
    [values],
  )

  const syncScrollPosition = useCallback(() => {
    scrollToValue(value)
  }, [scrollToValue, value])

  useLayoutEffect(() => {
    userInteractedRef.current = false
    syncScrollPosition()

    const rafId = window.requestAnimationFrame(syncScrollPosition)
    const timeoutIds = [0, 50, 150, 300].map((delay) =>
      window.setTimeout(syncScrollPosition, delay),
    )

    return () => {
      window.cancelAnimationFrame(rafId)
      timeoutIds.forEach((id) => window.clearTimeout(id))
    }
  }, [syncScrollPosition])

  const settleSelection = useCallback(
    (smooth = false) => {
      const scroller = scrollerRef.current
      if (!scroller) return

      const index = Math.max(
        0,
        Math.min(values.length - 1, Math.round(scroller.scrollTop / ITEM_HEIGHT)),
      )

      const top = index * ITEM_HEIGHT
      if (smooth) {
        scroller.scrollTo({ top, behavior: 'smooth' })
      } else {
        scroller.scrollTop = top
      }

      onChange(values[index]!)
    },
    [onChange, values],
  )

  const handleScroll = () => {
    if (suppressSettleRef.current || !userInteractedRef.current) return

    window.clearTimeout(settleTimerRef.current)
    settleTimerRef.current = window.setTimeout(() => settleSelection(false), 100)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden">
      <div
        ref={viewportRef}
        className="relative w-full max-w-[4rem] overflow-hidden"
        style={{ height: CLOCK_WHEEL_VIEWPORT_HEIGHT }}
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
            userInteractedRef.current = true
            isDraggingRef.current = true
          }}
          onPointerUp={() => {
            isDraggingRef.current = false
            if (userInteractedRef.current) settleSelection(true)
          }}
          onPointerLeave={() => {
            if (isDraggingRef.current && userInteractedRef.current) {
              settleSelection(true)
            }
          }}
          onWheel={() => {
            userInteractedRef.current = true
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
  minutes: number
  seconds: number
  onMinutesChange: (minutes: number) => void
  onSecondsChange: (seconds: number) => void
}

/** Time-only scroll wheels (minutes : seconds). */
export function ClockWheelEditor({
  minutes,
  seconds,
  onMinutesChange,
  onSecondsChange,
}: ClockWheelEditorProps) {
  const secondValues = getClockEditSecondValues(minutes)
  const clampedSeconds = minutes === CLOCK_EDIT_MAX_MINUTES ? 0 : seconds

  const handleMinutesChange = (nextMinutes: number) => {
    onMinutesChange(nextMinutes)
    if (nextMinutes === CLOCK_EDIT_MAX_MINUTES && seconds !== 0) {
      onSecondsChange(0)
    }
  }

  return (
    <div
      className="flex w-full items-center justify-center gap-1.5 overflow-hidden px-1"
      style={{ height: CLOCK_WHEEL_VIEWPORT_HEIGHT }}
    >
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
        value={clampedSeconds}
        onChange={onSecondsChange}
      />
    </div>
  )
}

interface ScrollWheelFieldProps {
  values: number[]
  value: number
  onChange: (value: number) => void
  groupLabel: string
  formatValue?: (value: number) => string
}

/** Single-column scroll wheel — same interaction as the time picker. */
export function ScrollWheelField({
  values,
  value,
  onChange,
  groupLabel,
  formatValue = (option) => String(option),
}: ScrollWheelFieldProps) {
  const min = values[0] ?? value
  const max = values[values.length - 1] ?? value
  const clamped = Math.max(min, Math.min(max, value))

  return (
    <div
      className="flex w-full items-center justify-center gap-1.5 overflow-hidden px-1"
      style={{ height: CLOCK_WHEEL_VIEWPORT_HEIGHT }}
      role="group"
      aria-label={groupLabel}
    >
      <ClockWheelColumn
        values={values}
        value={clamped}
        onChange={onChange}
        formatValue={formatValue}
      />
    </div>
  )
}

interface PeriodWheelEditorProps {
  period: number
  onPeriodChange: (period: number) => void
}

/** Period scroll wheel — same interaction as the time picker. */
export function PeriodWheelEditor({
  period,
  onPeriodChange,
}: PeriodWheelEditorProps) {
  return (
    <ScrollWheelField
      values={CLOCK_PERIOD_VALUES}
      value={period}
      onChange={onPeriodChange}
      groupLabel="Edit period"
      formatValue={(option) => formatPeriodLabel(option)}
    />
  )
}

const HORIZONTAL_ITEM_WIDTH = 44
/** Visible strip: selected item plus neighbors on each side. */
export const HORIZONTAL_PICKER_VIEWPORT_WIDTH = HORIZONTAL_ITEM_WIDTH * 5

interface HorizontalScrollPickerProps {
  values: number[]
  value: number
  onChange: (value: number) => void
  groupLabel: string
  formatValue?: (value: number) => string
}

/** Horizontal snap picker — same settle interaction as the time wheel. */
export function HorizontalScrollPicker({
  values,
  value,
  onChange,
  groupLabel,
  formatValue = (option) => String(option),
}: HorizontalScrollPickerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const settleTimerRef = useRef<number | undefined>(undefined)
  const isDraggingRef = useRef(false)
  const suppressSettleRef = useRef(false)
  const userInteractedRef = useRef(false)
  const [edgePadding, setEdgePadding] = useState(0)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const updatePadding = () => {
      setEdgePadding(Math.max(0, (viewport.clientWidth - HORIZONTAL_ITEM_WIDTH) / 2))
    }

    updatePadding()
    const observer = new ResizeObserver(updatePadding)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const scrollToValue = useCallback(
    (nextValue: number) => {
      const scroller = scrollerRef.current
      if (!scroller) return false

      const index = values.indexOf(nextValue)
      if (index < 0) return false

      const left = index * HORIZONTAL_ITEM_WIDTH
      suppressSettleRef.current = true
      scroller.scrollLeft = left

      window.setTimeout(() => {
        suppressSettleRef.current = false
      }, INITIAL_SCROLL_SUPPRESS_MS)

      return true
    },
    [values],
  )

  const syncScrollPosition = useCallback(() => {
    scrollToValue(value)
  }, [scrollToValue, value])

  useLayoutEffect(() => {
    userInteractedRef.current = false
    syncScrollPosition()

    const rafId = window.requestAnimationFrame(syncScrollPosition)
    const timeoutIds = [0, 50, 150, 300].map((delay) =>
      window.setTimeout(syncScrollPosition, delay),
    )

    return () => {
      window.cancelAnimationFrame(rafId)
      timeoutIds.forEach((id) => window.clearTimeout(id))
    }
  }, [syncScrollPosition])

  const settleSelection = useCallback(
    (smooth = false) => {
      const scroller = scrollerRef.current
      if (!scroller) return

      const index = Math.max(
        0,
        Math.min(
          values.length - 1,
          Math.round(scroller.scrollLeft / HORIZONTAL_ITEM_WIDTH),
        ),
      )

      const left = index * HORIZONTAL_ITEM_WIDTH
      if (smooth) {
        scroller.scrollTo({ left, behavior: 'smooth' })
      } else {
        scroller.scrollLeft = left
      }

      onChange(values[index]!)
    },
    [onChange, values],
  )

  const handleScroll = () => {
    if (suppressSettleRef.current || !userInteractedRef.current) return

    window.clearTimeout(settleTimerRef.current)
    settleTimerRef.current = window.setTimeout(() => settleSelection(false), 100)
  }

  const min = values[0] ?? value
  const max = values[values.length - 1] ?? value
  const clamped = Math.max(min, Math.min(max, value))

  return (
    <div
      className="flex w-full flex-col items-center overflow-hidden"
      role="group"
      aria-label={groupLabel}
    >
      <div
        ref={viewportRef}
        className="relative w-full max-w-sm overflow-hidden"
        style={{ height: 36 }}
      >
        <div
          className="pointer-events-none absolute inset-y-0.5 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-muted/35"
          style={{ width: HORIZONTAL_ITEM_WIDTH }}
        />
        <div
          ref={scrollerRef}
          className={cn(
            'relative z-20 flex h-full overflow-x-auto overscroll-x-contain snap-x snap-mandatory',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          )}
          onScroll={handleScroll}
          onPointerDown={() => {
            userInteractedRef.current = true
            isDraggingRef.current = true
          }}
          onPointerUp={() => {
            isDraggingRef.current = false
            if (userInteractedRef.current) settleSelection(true)
          }}
          onPointerLeave={() => {
            if (isDraggingRef.current && userInteractedRef.current) {
              settleSelection(true)
            }
          }}
          onWheel={(event) => {
            // Convert vertical wheel into horizontal scroll for trackpads/mice.
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
              event.currentTarget.scrollLeft += event.deltaY
              event.preventDefault()
            }
            userInteractedRef.current = true
            if (suppressSettleRef.current) return

            window.clearTimeout(settleTimerRef.current)
            settleTimerRef.current = window.setTimeout(
              () => settleSelection(false),
              100,
            )
          }}
        >
          <div className="shrink-0" style={{ width: edgePadding }} aria-hidden />
          {values.map((option) => {
            const selected = option === clamped
            return (
              <button
                key={option}
                type="button"
                className={cn(
                  'flex h-full shrink-0 snap-center items-center justify-center tabular-nums transition-[opacity,color,font-size]',
                  selected
                    ? 'text-base font-bold text-foreground'
                    : 'text-xs text-muted-foreground/70',
                )}
                style={{ width: HORIZONTAL_ITEM_WIDTH }}
                onClick={() => {
                  userInteractedRef.current = true
                  onChange(option)
                  scrollToValue(option)
                }}
              >
                {formatValue(option)}
              </button>
            )
          })}
          <div className="shrink-0" style={{ width: edgePadding }} aria-hidden />
        </div>
      </div>
    </div>
  )
}

interface PeriodHorizontalPickerProps {
  period: number
  onPeriodChange: (period: number) => void
  /** Optional ruleset so OT labels match the league. */
  rulesetId?: Parameters<typeof formatPeriodLabel>[1]
}

/** Horizontal period picker — Q1–Q4 then OT… (same settle UX as the time wheel). */
export function PeriodHorizontalPicker({
  period,
  onPeriodChange,
  rulesetId,
}: PeriodHorizontalPickerProps) {
  return (
    <HorizontalScrollPicker
      values={CLOCK_PERIOD_VALUES}
      value={period}
      onChange={onPeriodChange}
      groupLabel="Edit period"
      formatValue={(option) => formatPeriodLabel(option, rulesetId)}
    />
  )
}
