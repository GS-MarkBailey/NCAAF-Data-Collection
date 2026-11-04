import { useEffect, useState, type Ref } from 'react'
import { Minus, Plus } from 'lucide-react'
import {
  clampBallOn,
  getFootballRuleset,
  type FootballCode,
} from '@/lib/football'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface BallOnEditorProps {
  /** Offense-relative yards from own goal. */
  ballOn: number
  onBallOnChange: (ballOn: number) => void
  inputRef?: Ref<HTMLInputElement>
  rulesetId?: FootballCode
}

function parseBallOnInput(raw: string, rulesetId?: FootballCode): number | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  return clampBallOn(Number.parseInt(digits, 10), rulesetId)
}

/** Compact − / value / + editor for offense-relative ball-on. */
export function BallOnEditor({
  ballOn,
  onBallOnChange,
  inputRef,
  rulesetId,
}: BallOnEditorProps) {
  const rules = getFootballRuleset(rulesetId)
  const clamped = clampBallOn(ballOn, rulesetId)
  const displayValue = String(clamped)
  const [draft, setDraft] = useState(displayValue)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(String(clamped))
  }, [clamped, editing])

  const commitDraft = (raw: string) => {
    const parsed = parseBallOnInput(raw, rulesetId)
    if (parsed == null) {
      setDraft(displayValue)
      return
    }
    onBallOnChange(parsed)
    setDraft(String(parsed))
  }

  return (
    <div
      className="flex w-full items-center justify-center gap-3 px-1"
      role="group"
      aria-label="Edit ball on"
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-12 min-h-12 min-w-12 shrink-0"
        disabled={clamped <= rules.minBallOn}
        aria-label="Decrease ball on"
        onClick={() => onBallOnChange(clampBallOn(clamped - 1, rulesetId))}
      >
        <Minus className="size-5" />
      </Button>
      <div className="flex min-w-0 max-w-[7rem] flex-none flex-col items-center gap-2">
        <label
          htmlFor="ball-on-edit-value"
          className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
        >
          Ball on
        </label>
        <Input
          ref={inputRef}
          id="ball-on-edit-value"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          autoFocus
          value={editing ? draft : displayValue}
          aria-label="Ball on"
          className={cn(
            'h-[clamp(2.75rem,18cqw,4rem)] w-full max-w-[6.5rem] px-[clamp(0.25rem,2cqw,0.625rem)]',
            'text-center text-[length:clamp(1.25rem,12cqw,2.25rem)] font-bold tabular-nums md:text-[length:clamp(1.25rem,12cqw,2.25rem)]',
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
            const next = event.target.value
            setDraft(next)
            const parsed = parseBallOnInput(next, rulesetId)
            if (parsed != null && /^\d+$/.test(next.trim())) {
              onBallOnChange(parsed)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-12 min-h-12 min-w-12 shrink-0"
        disabled={clamped >= rules.maxBallOn}
        aria-label="Increase ball on"
        onClick={() => onBallOnChange(clampBallOn(clamped + 1, rulesetId))}
      >
        <Plus className="size-5" />
      </Button>
    </div>
  )
}
