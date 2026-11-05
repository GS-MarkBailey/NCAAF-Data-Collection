import { useEffect, useState, type Ref } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ScoreboardStepperFieldProps {
  id: string
  label: string
  value: number
  displayValue: string
  min: number
  max: number
  groupLabel: string
  autoFocus?: boolean
  inputRef?: Ref<HTMLInputElement>
  inputMode?: 'numeric' | 'text'
  parseInput: (raw: string) => number | null
  /** Return true when a live draft should commit while typing. */
  shouldLiveCommit?: (raw: string) => boolean
  normalizeDraft?: (raw: string) => string
  onChange: (value: number) => void
}

/**
 * Mobile-friendly − / value / + control for the scoreboard bottom panel.
 * Panel title provides the field name; value field flexes for narrow columns.
 */
export function ScoreboardStepperField({
  id,
  label,
  value,
  displayValue,
  min,
  max,
  groupLabel,
  autoFocus = false,
  inputRef,
  inputMode = 'numeric',
  parseInput,
  shouldLiveCommit = (raw) => /^\d+$/.test(raw.trim()),
  normalizeDraft = (raw) => raw,
  onChange,
}: ScoreboardStepperFieldProps) {
  const [draft, setDraft] = useState(displayValue)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(displayValue)
  }, [displayValue, editing])

  const commitDraft = (raw: string) => {
    const parsed = parseInput(raw)
    if (parsed == null) {
      setDraft(displayValue)
      return
    }
    onChange(parsed)
  }

  return (
    <div
      className="@container flex w-full max-w-sm items-center gap-2 px-1"
      role="group"
      aria-label={groupLabel}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 min-h-11 min-w-11 shrink-0 touch-manipulation"
        disabled={value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="size-5" />
      </Button>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode={inputMode}
        pattern={inputMode === 'numeric' ? '[0-9]*' : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        autoFocus={autoFocus}
        value={editing ? draft : displayValue}
        aria-label={label}
        className={cn(
          'h-11 min-h-11 min-w-0 flex-1 px-2',
          'text-center text-2xl font-bold tabular-nums',
          'caret-[var(--color-brand)] selection:bg-transparent selection:text-inherit',
          'focus-visible:border-[var(--color-brand)] focus-visible:ring-[var(--color-brand)]/35',
        )}
        onFocus={(event) => {
          setEditing(true)
          setDraft(displayValue)
          const el = event.currentTarget
          requestAnimationFrame(() => {
            const len = el.value.length
            try {
              el.setSelectionRange(len, len)
            } catch {
              /* ignore */
            }
          })
        }}
        onBlur={() => {
          commitDraft(draft)
          setEditing(false)
        }}
        onChange={(event) => {
          const next = normalizeDraft(event.target.value)
          setDraft(next)
          const parsed = parseInput(next)
          if (parsed != null && shouldLiveCommit(next)) {
            onChange(parsed)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 min-h-11 min-w-11 shrink-0 touch-manipulation"
        disabled={value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="size-5" />
      </Button>
    </div>
  )
}
