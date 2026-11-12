import {
  formatPeriodLabel,
  getAvailablePeriodStatuses,
  PERIOD_STATUS_LABEL,
  type FootballCode,
  type PeriodStatus,
} from '@/lib/football'
import { PeriodHorizontalPicker } from '@/components/game/ClockWheelEditor'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { OPERATOR_SECONDARY_SURFACE } from '@/lib/operatorChrome'

interface PeriodManagementEditorProps {
  period: number
  status: PeriodStatus
  onPeriodChange: (period: number) => void
  onStatusChange: (status: PeriodStatus) => void
  rulesetId?: FootballCode
}

/** Combined period picker + status options (AC7) — roomy single-panel layout. */
export function PeriodManagementEditor({
  period,
  status,
  onPeriodChange,
  onStatusChange,
  rulesetId,
}: PeriodManagementEditorProps) {
  const available = getAvailablePeriodStatuses(period, rulesetId)

  const handlePeriodChange = (nextPeriod: number) => {
    onPeriodChange(nextPeriod)
    const nextAvailable = getAvailablePeriodStatuses(nextPeriod, rulesetId)
    if (!nextAvailable.includes(status)) {
      onStatusChange('not_started')
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-center gap-5 overflow-hidden px-4 py-4">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Period · {formatPeriodLabel(period, rulesetId)}
        </p>
        <PeriodHorizontalPicker
          period={period}
          onPeriodChange={handlePeriodChange}
          rulesetId={rulesetId}
        />
      </div>

      <div
        className="flex min-h-0 flex-col gap-2 overflow-y-auto"
        role="radiogroup"
        aria-label="Period status"
      >
        <p className="shrink-0 text-center text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Status
        </p>
        <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-2">
          {available.map((option, index) => {
            const selected = option === status
            const oddLast =
              available.length % 2 === 1 && index === available.length - 1
            return (
              <Button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                variant="secondary"
                size="sm"
                className={cn(
                  'h-12 min-h-12 w-full shrink-0 touch-manipulation justify-center px-3 text-sm font-medium',
                  oddLast && 'col-span-2',
                  selected
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/10 text-foreground ring-1 ring-[var(--color-brand)]/40'
                    : OPERATOR_SECONDARY_SURFACE,
                )}
                onClick={() => onStatusChange(option)}
              >
                {PERIOD_STATUS_LABEL[option]}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
