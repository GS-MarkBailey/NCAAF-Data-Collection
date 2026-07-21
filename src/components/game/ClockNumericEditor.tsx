import { Minus, Plus } from 'lucide-react'
import {
  CLOCK_EDIT_MAX_MINUTES,
  CLOCK_EDIT_MAX_SECONDS,
  MAX_PERIOD,
  MIN_PERIOD,
  clampPeriod,
} from '@/lib/clock'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ClockNumericEditorProps {
  period: number
  minutes: number
  seconds: number
  onPeriodChange: (period: number) => void
  onMinutesChange: (minutes: number) => void
  onSecondsChange: (seconds: number) => void
}

function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}

interface NumericFieldProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  pad?: boolean
  disabled?: boolean
  onChange: (value: number) => void
}

function NumericField({
  id,
  label,
  value,
  min,
  max,
  pad = true,
  disabled = false,
  onChange,
}: NumericFieldProps) {
  const display = pad ? value.toString().padStart(2, '0') : String(value)

  const nudge = (delta: number) => {
    onChange(clampInt(value + delta, min, max))
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <label
        htmlFor={id}
        className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
      >
        {label}
      </label>
      <div className="flex w-full max-w-[5.5rem] flex-col items-stretch gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-full"
          aria-label={`Increase ${label}`}
          disabled={disabled || value >= max}
          onClick={() => nudge(1)}
        >
          <Plus className="size-4" />
        </Button>
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          enterKeyHint="done"
          disabled={disabled}
          value={display}
          aria-label={label}
          className={cn(
            'h-12 text-center text-2xl font-bold tabular-nums',
            disabled && 'opacity-60',
          )}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '')
            if (digits === '') {
              onChange(min)
              return
            }
            onChange(clampInt(Number.parseInt(digits, 10), min, max))
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-full"
          aria-label={`Decrease ${label}`}
          disabled={disabled || value <= min}
          onClick={() => nudge(-1)}
        >
          <Minus className="size-4" />
        </Button>
      </div>
    </div>
  )
}

/** Direct numeric clock editor — feature-flagged alternative to the scroll wheel. */
export function ClockNumericEditor({
  period,
  minutes,
  seconds,
  onPeriodChange,
  onMinutesChange,
  onSecondsChange,
}: ClockNumericEditorProps) {
  const secondsLocked = minutes >= CLOCK_EDIT_MAX_MINUTES
  const clampedSeconds = secondsLocked ? 0 : seconds

  const handleMinutesChange = (nextMinutes: number) => {
    const clamped = clampInt(nextMinutes, 0, CLOCK_EDIT_MAX_MINUTES)
    onMinutesChange(clamped)
    if (clamped === CLOCK_EDIT_MAX_MINUTES && seconds !== 0) {
      onSecondsChange(0)
    }
  }

  return (
    <div
      className="flex w-full max-w-sm items-start justify-center gap-2 px-2 py-1"
      role="group"
      aria-label="Edit game clock"
    >
      <NumericField
        id="clock-edit-period"
        label="Period"
        value={clampPeriod(period)}
        min={MIN_PERIOD}
        max={MAX_PERIOD}
        pad={false}
        onChange={onPeriodChange}
      />
      <span
        className="mt-[2.65rem] shrink-0 text-xl font-bold text-muted-foreground"
        aria-hidden
      >
        ·
      </span>
      <NumericField
        id="clock-edit-minutes"
        label="Min"
        value={minutes}
        min={0}
        max={CLOCK_EDIT_MAX_MINUTES}
        onChange={handleMinutesChange}
      />
      <span
        className="mt-[2.65rem] shrink-0 text-xl font-bold text-muted-foreground"
        aria-hidden
      >
        :
      </span>
      <NumericField
        id="clock-edit-seconds"
        label="Sec"
        value={clampedSeconds}
        min={0}
        max={CLOCK_EDIT_MAX_SECONDS}
        disabled={secondsLocked}
        onChange={onSecondsChange}
      />
    </div>
  )
}
