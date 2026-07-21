import { useRef } from 'react'
import {
  CLOCK_EDIT_MAX_MINUTES,
  CLOCK_EDIT_MAX_SECONDS,
  MAX_PERIOD,
  MIN_PERIOD,
  clampPeriod,
} from '@/lib/clock'
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
  /** First digit after focus replaces the value (no select-all highlight). */
  const replaceOnTypeRef = useRef(true)

  const commitDigits = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (digits === '') {
      onChange(min)
      return
    }
    onChange(clampInt(Number.parseInt(digits, 10), min, max))
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <label
        htmlFor={id}
        className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
      >
        {label}
      </label>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        disabled={disabled}
        value={display}
        aria-label={label}
        className={cn(
          // Override base Input `text-base md:text-sm` so digits stay large on all breakpoints
          'h-16 w-full max-w-[6.5rem] text-center text-4xl font-bold tabular-nums md:text-4xl',
          // Active field = focus ring only — never blue text-selection highlight
          'caret-[var(--color-brand)] selection:bg-transparent selection:text-inherit',
          'focus-visible:border-[var(--color-brand)] focus-visible:ring-[var(--color-brand)]/35',
          disabled && 'opacity-60',
        )}
        onFocus={(event) => {
          replaceOnTypeRef.current = true
          const el = event.currentTarget
          // Collapse any selection so mobile does not paint a text-editor highlight
          requestAnimationFrame(() => {
            const len = el.value.length
            try {
              el.setSelectionRange(len, len)
            } catch {
              /* some mobile WebViews reject setSelectionRange on certain types */
            }
          })
        }}
        onMouseUp={(event) => {
          // iOS/Safari often re-selects on mouseup after focus — collapse again
          const el = event.currentTarget
          if (el.selectionStart !== el.selectionEnd) {
            const len = el.value.length
            try {
              el.setSelectionRange(len, len)
            } catch {
              /* ignore */
            }
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Backspace' || event.key === 'Delete') {
            replaceOnTypeRef.current = false
          }
        }}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '')
          if (replaceOnTypeRef.current) {
            replaceOnTypeRef.current = false
            // Typing after focus replaces the whole field with the newest digit(s)
            const typed =
              digits.length > display.replace(/\D/g, '').length
                ? digits.slice(display.replace(/\D/g, '').length)
                : digits
            commitDigits(typed || digits.slice(-1))
            return
          }
          commitDigits(digits)
        }}
      />
    </div>
  )
}

/** Variant B — dialog-friendly numeric clock editor (not the scroll wheel). */
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
      className="flex w-full max-w-md items-center justify-center gap-3 px-1"
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
        className="mt-6 shrink-0 text-4xl font-bold text-muted-foreground"
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
        className="mt-6 shrink-0 text-4xl font-bold text-muted-foreground"
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
