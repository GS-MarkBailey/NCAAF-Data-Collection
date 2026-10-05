import { useEffect, useState, type Ref } from 'react'
import { Minus, Plus } from 'lucide-react'
import {
  clampDistance,
  clampDown,
  getFootballRuleset,
  parseDistanceInput,
  parseDownInput,
  type FootballCode,
} from '@/lib/football'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export type DownDistanceEditTab = 'down' | 'distance'

interface DownDistanceEditorProps {
  down: number
  distance: number
  onDownChange: (down: number) => void
  onDistanceChange: (distance: number) => void
  initialTab?: DownDistanceEditTab
  downInputRef?: Ref<HTMLInputElement>
  distanceInputRef?: Ref<HTMLInputElement>
  /** League rules pack — drives max downs (4 NCAA/NFL, 3 CFL). */
  rulesetId?: FootballCode
}

function StepperField({
  id,
  label,
  value,
  min,
  max,
  displayValue,
  autoFocus,
  inputRef,
  parseInput,
  onChange,
  groupLabel,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  displayValue: string
  autoFocus?: boolean
  inputRef?: Ref<HTMLInputElement>
  parseInput: (raw: string) => number | null
  onChange: (value: number) => void
  groupLabel: string
}) {
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
    setDraft(String(parsed))
  }

  return (
    <div
      className="flex w-full items-center justify-center gap-3 px-1"
      role="group"
      aria-label={groupLabel}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-12 min-h-12 min-w-12 shrink-0"
        disabled={value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="size-5" />
      </Button>
      <div className="flex min-w-0 max-w-[7rem] flex-none flex-col items-center gap-2">
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
          autoFocus={autoFocus}
          value={editing ? draft : displayValue}
          aria-label={label}
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
            const parsed = parseInput(next)
            if (parsed != null && /^\d+$/.test(next.trim())) {
              onChange(parsed)
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
        disabled={value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="size-5" />
      </Button>
    </div>
  )
}

export function DownDistanceEditor({
  down,
  distance,
  onDownChange,
  onDistanceChange,
  initialTab = 'down',
  downInputRef,
  distanceInputRef,
  rulesetId,
}: DownDistanceEditorProps) {
  const rules = getFootballRuleset(rulesetId)
  const [tab, setTab] = useState<DownDistanceEditTab>(initialTab)
  const clampedDown = clampDown(down, rules)
  const clampedDistance = clampDistance(distance, rules)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  const handleTabChange = (value: string | number | null) => {
    if (value === 'down' || value === 'distance') {
      setTab(value)
    }
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target =
        tab === 'down'
          ? document.getElementById('down-edit-value')
          : document.getElementById('distance-edit-value')
      if (target instanceof HTMLInputElement && !target.disabled) {
        target.focus()
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [tab])

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="w-full gap-3">
      <TabsList className="mx-auto w-full max-w-xs">
        <TabsTrigger value="down" className="flex-1">
          Down
        </TabsTrigger>
        <TabsTrigger value="distance" className="flex-1">
          To go
        </TabsTrigger>
      </TabsList>

      <TabsContent value="down" className="outline-none">
        <StepperField
          id="down-edit-value"
          label="Down"
          value={clampedDown}
          min={rules.minDown}
          max={rules.maxDown}
          displayValue={String(clampedDown)}
          autoFocus={tab === 'down'}
          inputRef={downInputRef}
          parseInput={(raw) => parseDownInput(raw, rules)}
          onChange={(next) => onDownChange(clampDown(next, rules))}
          groupLabel="Edit down"
        />
      </TabsContent>

      <TabsContent value="distance" className="outline-none">
        <StepperField
          id="distance-edit-value"
          label="To go"
          value={clampedDistance}
          min={rules.minDistance}
          max={rules.maxDistance}
          displayValue={String(clampedDistance)}
          autoFocus={tab === 'distance'}
          inputRef={distanceInputRef}
          parseInput={(raw) => parseDistanceInput(raw, rules)}
          onChange={(next) => onDistanceChange(clampDistance(next, rules))}
          groupLabel="Edit yards to go"
        />
      </TabsContent>
    </Tabs>
  )
}
