import { useRef, type Ref } from 'react'
import {
  CLOCK_EDIT_MAX_MINUTES,
  CLOCK_EDIT_MAX_SECONDS,
  MAX_PERIOD,
  MIN_PERIOD,
  formatPeriodLabel,
  parsePeriodInput,
} from '@/lib/clock'
import { ScoreboardStepperField } from '@/components/game/ScoreboardStepperField'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type ClockEditTab = 'period' | 'time'

interface ClockNumericEditorProps {
  period: number
  minutes: number
  seconds: number
  onPeriodChange: (period: number) => void
  onMinutesChange: (minutes: number) => void
  onSecondsChange: (seconds: number) => void
  /** Which editor to show — period or time (no in-panel switcher). */
  initialTab?: ClockEditTab
  periodInputRef?: Ref<HTMLInputElement>
  minutesInputRef?: Ref<HTMLInputElement>
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
  autoFocus?: boolean
  inputRef?: Ref<HTMLInputElement>
  onChange: (value: number) => void
  className?: string
}

function NumericField({
  id,
  label,
  value,
  min,
  max,
  pad = true,
  disabled = false,
  autoFocus = false,
  inputRef,
  onChange,
  className,
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

  const commitReplaceDigit = (raw: string) => {
    replaceOnTypeRef.current = false
    const digits = raw.replace(/\D/g, '')
    if (!digits) return
    // Use the whole inserted run when possible (e.g. paste "12"), else last digit
    commitDigits(digits.length <= 2 ? digits : digits.slice(-2))
  }

  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-2',
        className,
      )}
    >
      <label
        htmlFor={id}
        className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
      >
        {label}
      </label>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        disabled={disabled}
        autoFocus={autoFocus}
        value={display}
        aria-label={label}
        className={cn(
          'h-11 min-h-11 w-full min-w-0 px-2',
          'text-center text-2xl font-bold tabular-nums',
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
        onBeforeInput={(event) => {
          const data = (event as unknown as { data?: string | null }).data
          if (
            replaceOnTypeRef.current &&
            typeof data === 'string' &&
            /^\d+$/.test(data)
          ) {
            event.preventDefault()
            commitReplaceDigit(data)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Backspace' || event.key === 'Delete') {
            replaceOnTypeRef.current = false
            return
          }
          if (
            replaceOnTypeRef.current &&
            /^\d$/.test(event.key) &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            event.preventDefault()
            commitReplaceDigit(event.key)
          }
        }}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '')
          if (replaceOnTypeRef.current) {
            // Fallback when beforeInput/keyDown did not handle replace (some mobile IME)
            replaceOnTypeRef.current = false
            commitDigits(digits.slice(-1) || digits)
            return
          }
          commitDigits(digits)
        }}
      />
    </div>
  )
}

/** Variant B — numeric clock / period editor (not the scroll wheel). */
export function ClockNumericEditor({
  period,
  minutes,
  seconds,
  onPeriodChange,
  onMinutesChange,
  onSecondsChange,
  initialTab = 'time',
  periodInputRef,
  minutesInputRef,
}: ClockNumericEditorProps) {
  const secondsLocked = minutes >= CLOCK_EDIT_MAX_MINUTES
  const clampedSeconds = secondsLocked ? 0 : seconds
  const clampedPeriod = Math.max(MIN_PERIOD, Math.min(MAX_PERIOD, period))

  const handleMinutesChange = (nextMinutes: number) => {
    const clamped = clampInt(nextMinutes, 0, CLOCK_EDIT_MAX_MINUTES)
    onMinutesChange(clamped)
    if (clamped === CLOCK_EDIT_MAX_MINUTES && seconds !== 0) {
      onSecondsChange(0)
    }
  }

  if (initialTab === 'period') {
    return (
      <ScoreboardStepperField
        id="clock-edit-period"
        label="Period"
        value={clampedPeriod}
        displayValue={formatPeriodLabel(clampedPeriod)}
        min={MIN_PERIOD}
        max={MAX_PERIOD}
        groupLabel="Edit period"
        autoFocus
        inputRef={periodInputRef}
        inputMode="text"
        parseInput={parsePeriodInput}
        shouldLiveCommit={(raw) => /^(?:\d+|OT\d*)$/i.test(raw.trim())}
        normalizeDraft={(raw) => raw.toUpperCase()}
        onChange={onPeriodChange}
      />
    )
  }

  return (
    <div
      className="@container flex w-full max-w-sm items-end justify-center gap-2 px-1"
      role="group"
      aria-label="Edit game clock time"
    >
      <NumericField
        id="clock-edit-minutes"
        label="Min"
        value={minutes}
        min={0}
        max={CLOCK_EDIT_MAX_MINUTES}
        autoFocus
        inputRef={minutesInputRef}
        onChange={handleMinutesChange}
      />
      <span
        className="mb-2 shrink-0 text-2xl font-bold text-muted-foreground"
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
