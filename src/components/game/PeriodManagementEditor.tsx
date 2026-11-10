import {
  formatPeriodLabel,
  getAvailablePeriodStatuses,
  PERIOD_STATUS_LABEL,
  type FootballCode,
  type PeriodStatus,
} from '@/lib/football'
import { PeriodWheelEditor } from '@/components/game/ClockWheelEditor'
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

/** Combined period wheel + status options (AC7). */
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
    <div className="flex h-full min-h-0 w-full flex-col items-stretch gap-3 overflow-hidden px-2 py-2">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Period
        </p>
        <PeriodWheelEditor
          period={period}
          onPeriodChange={handlePeriodChange}
        />
        <p className="text-xs text-muted-foreground">
          {formatPeriodLabel(period, rulesetId)}
        </p>
      </div>

      <div
        className="flex shrink-0 flex-col gap-2"
        role="radiogroup"
        aria-label="Period status"
      >
        <p className="text-center text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Status
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {available.map((option) => {
            const selected = option === status
            return (
              <Button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                variant="secondary"
                className={cn(
                  'h-10 min-h-10 w-full shrink-0 touch-manipulation justify-center text-sm font-medium',
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
