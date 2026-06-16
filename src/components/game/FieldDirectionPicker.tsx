import { ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/gameStore'

interface FieldDirectionPickerProps {
  fixtureId: string
  homeAbbr: string
  homeAttacksRight: boolean | null
  variant?: 'custom' | 'shadcn'
  className?: string
}

export function FieldDirectionPicker({
  fixtureId,
  homeAbbr,
  homeAttacksRight,
  variant = 'custom',
  className,
}: FieldDirectionPickerProps) {
  const setHomeAttacksRight = useAppStore((s) => s.setHomeAttacksRight)

  const buttonClass = cn(
    'inline-flex items-center justify-center gap-2 rounded-[8px] border px-4 py-2 text-sm font-semibold transition-colors',
    variant === 'custom' &&
      'border-[var(--color-panel-border)] bg-[var(--color-panel)] text-[var(--color-text)] active:bg-[var(--color-play-card-bg)]',
    variant === 'shadcn' &&
      'border-border bg-background text-foreground hover:bg-muted',
  )

  const selectedClass = cn(
    variant === 'custom' && 'bg-[var(--color-play-card-bg)] ring-2 ring-[var(--color-brand)]',
    variant === 'shadcn' && 'bg-muted ring-2 ring-ring',
  )

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      <button
        type="button"
        className={cn(buttonClass, homeAttacksRight === false && selectedClass)}
        aria-pressed={homeAttacksRight === false}
        onClick={() => setHomeAttacksRight(fixtureId, false)}
      >
        <ArrowLeft className="size-4" aria-hidden />
        Attacks left
      </button>
      <button
        type="button"
        className={cn(buttonClass, homeAttacksRight === true && selectedClass)}
        aria-pressed={homeAttacksRight === true}
        onClick={() => setHomeAttacksRight(fixtureId, true)}
      >
        Attacks right
        <ArrowRight className="size-4" aria-hidden />
      </button>
      <p
        className={cn(
          'col-span-2 text-center text-xs',
          variant === 'custom' && 'text-[var(--color-text-muted)]',
          variant === 'shadcn' && 'text-muted-foreground',
        )}
      >
        {homeAbbr} attack direction for Q1 (adjusted each quarter)
      </p>
    </div>
  )
}
