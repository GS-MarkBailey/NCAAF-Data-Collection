import { useEffect, useRef, useState, type Ref } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export type ClockEditTab = 'period' | 'time'

interface ClockNumericEditorProps {
  period: number
  minutes: number
  seconds: number
  onPeriodChange: (period: number) => void
  onMinutesChange: (minutes: number) => void
  onSecondsChange: (seconds: number) => void
  /** Which tab to show when the dialog opens. */
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
          // Fluid size from editor width; override base Input `text-base md:text-sm`
          'h-[clamp(2.75rem,18cqw,4rem)] w-full max-w-[6.5rem] px-[clamp(0.25rem,2cqw,0.625rem)]',
          'text-center text-[length:clamp(1.25rem,12cqw,2.25rem)] font-bold tabular-nums md:text-[length:clamp(1.25rem,12cqw,2.25rem)]',
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

function PeriodEditor({
  period,
  onPeriodChange,
  autoFocus,
  inputRef,
}: {
  period: number
  onPeriodChange: (period: number) => void
  autoFocus?: boolean
  inputRef?: Ref<HTMLInputElement>
}) {
  const value = clampPeriod(period)

  return (
    <div
      className="flex w-full items-center justify-center gap-3 px-1"
      role="group"
      aria-label="Edit period"
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-12 min-h-12 min-w-12 shrink-0"
        disabled={value <= MIN_PERIOD}
        aria-label="Decrease period"
        onClick={() => onPeriodChange(clampPeriod(value - 1))}
      >
        <Minus className="size-5" />
      </Button>
      <NumericField
        id="clock-edit-period"
        label="Period"
        value={value}
        min={MIN_PERIOD}
        max={MAX_PERIOD}
        pad={false}
        autoFocus={autoFocus}
        inputRef={inputRef}
        onChange={onPeriodChange}
        className="max-w-[7rem] flex-none"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-12 min-h-12 min-w-12 shrink-0"
        disabled={value >= MAX_PERIOD}
        aria-label="Increase period"
        onClick={() => onPeriodChange(clampPeriod(value + 1))}
      >
        <Plus className="size-5" />
      </Button>
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
  initialTab = 'time',
  periodInputRef,
  minutesInputRef,
}: ClockNumericEditorProps) {
  const [tab, setTab] = useState<ClockEditTab>(initialTab)
  const secondsLocked = minutes >= CLOCK_EDIT_MAX_MINUTES
  const clampedSeconds = secondsLocked ? 0 : seconds

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  const handleMinutesChange = (nextMinutes: number) => {
    const clamped = clampInt(nextMinutes, 0, CLOCK_EDIT_MAX_MINUTES)
    onMinutesChange(clamped)
    if (clamped === CLOCK_EDIT_MAX_MINUTES && seconds !== 0) {
      onSecondsChange(0)
    }
  }

  const handleTabChange = (value: string | number | null) => {
    if (value === 'period' || value === 'time') {
      setTab(value)
    }
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target =
        tab === 'period'
          ? document.getElementById('clock-edit-period')
          : document.getElementById('clock-edit-minutes')
      if (target instanceof HTMLInputElement && !target.disabled) {
        target.focus()
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [tab])

  return (
    <Tabs
      value={tab}
      onValueChange={handleTabChange}
      className="w-full gap-3"
    >
      <TabsList className="mx-auto w-full max-w-xs">
        <TabsTrigger value="period" className="flex-1">
          Period
        </TabsTrigger>
        <TabsTrigger value="time" className="flex-1">
          Time
        </TabsTrigger>
      </TabsList>

      <TabsContent value="period" className="outline-none">
        <PeriodEditor
          period={period}
          onPeriodChange={onPeriodChange}
          autoFocus={tab === 'period'}
          inputRef={periodInputRef}
        />
      </TabsContent>

      <TabsContent value="time" className="outline-none">
        <div
          className="@container flex w-full max-w-md items-center justify-center gap-[clamp(0.25rem,2cqw,0.75rem)] px-1"
          role="group"
          aria-label="Edit game clock time"
        >
          <NumericField
            id="clock-edit-minutes"
            label="Min"
            value={minutes}
            min={0}
            max={CLOCK_EDIT_MAX_MINUTES}
            autoFocus={tab === 'time'}
            inputRef={minutesInputRef}
            onChange={handleMinutesChange}
          />
          <span
            className="mt-[clamp(1rem,4cqw,1.5rem)] shrink-0 text-[length:clamp(1.25rem,12cqw,2.25rem)] font-bold text-muted-foreground"
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
      </TabsContent>
    </Tabs>
  )
}
