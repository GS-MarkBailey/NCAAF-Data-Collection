import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export type ConnectionStatus = 'online'

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; dotClassName: string }
> = {
  online: {
    label: 'online',
    dotClassName: 'bg-emerald-500',
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
      className="h-7 gap-1.5 px-2 text-xs font-medium normal-case"
    >
      <span
        className={cn('size-2 shrink-0 rounded-full', config.dotClassName)}
        aria-hidden
      />
      {config.label}
    </Badge>
  )
}
