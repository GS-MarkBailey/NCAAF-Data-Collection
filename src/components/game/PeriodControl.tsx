import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MAX_PERIOD, MIN_PERIOD } from '@/lib/clock'
import { Button } from '@/components/ui/button'

interface PeriodControlProps {
  period: number
  onPeriodChange: (period: number) => void
  className?: string
}

export function PeriodControl({
  period,
  onPeriodChange,
  className,
}: PeriodControlProps) {
  const canDecrease = period > MIN_PERIOD
  const canIncrease = period < MAX_PERIOD

  return (
    <div
      className={cn(
        'flex w-[4.25rem] shrink-0 flex-col items-stretch border-r border-border bg-background',
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-9 shrink-0 rounded-none"
        disabled={!canIncrease}
        onClick={() => onPeriodChange(period + 1)}
        aria-label={`Increase period, currently quarter ${period}`}
      >
        <ChevronUp className="size-4" />
      </Button>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          QTR
        </span>
        <span className="mt-0.5 text-2xl font-bold leading-none tabular-nums landscape-mobile:text-xl">
          {period}
        </span>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-9 shrink-0 rounded-none"
        disabled={!canDecrease}
        onClick={() => onPeriodChange(period - 1)}
        aria-label={`Decrease period, currently quarter ${period}`}
      >
        <ChevronDown className="size-4" />
      </Button>
    </div>
  )
}
