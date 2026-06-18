import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export type ConnectionStatus = 'online'

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; dotClassName: string; chipClassName: string }
> = {
  online: {
    label: 'online',
    dotClassName: 'bg-emerald-500',
    chipClassName:
      'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
}

interface ConnectionStatusChipProps {
  status?: ConnectionStatus
}

export function ConnectionStatusChip({
  status = 'online',
}: ConnectionStatusChipProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge
      variant="outline"
      className={cn(
        'h-7 gap-1.5 px-2 text-xs font-medium normal-case',
        config.chipClassName,
      )}
    >
      <span
        className={cn('size-2 shrink-0 rounded-full', config.dotClassName)}
        aria-hidden
      />
      {config.label}
    </Badge>
  )
}
