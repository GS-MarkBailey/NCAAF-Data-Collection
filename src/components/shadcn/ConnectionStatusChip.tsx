import { ChevronDown } from 'lucide-react'
import { Popover } from '@base-ui/react/popover'
import { cn } from '@/lib/utils'

export type ConnectionStatusKind =
  | 'online'
  | 'offline'
  | 'reconnecting'
  | 'degraded'

export interface ConnectionStatusItem {
  label: string
  status: ConnectionStatusKind
}

const STATUS_STYLE: Record<
  ConnectionStatusKind,
  {
    label: string
    dotClassName: string
    chipClassName: string
    textClassName: string
  }
> = {
  online: {
    label: 'connected',
    dotClassName: 'bg-emerald-500',
    chipClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    textClassName: 'text-emerald-700',
  },
  offline: {
    label: 'offline',
    dotClassName: 'bg-red-500',
    chipClassName: 'border-red-200 bg-red-50 text-red-800',
    textClassName: 'text-red-700',
  },
  reconnecting: {
    label: 'reconnecting',
    dotClassName: 'bg-amber-500',
    chipClassName: 'border-amber-200 bg-amber-50 text-amber-900',
    textClassName: 'text-amber-800',
  },
  degraded: {
    label: 'degraded',
    dotClassName: 'bg-orange-500',
    chipClassName: 'border-orange-200 bg-orange-50 text-orange-900',
    textClassName: 'text-orange-800',
  },
}

const STATUS_PRIORITY: Record<ConnectionStatusKind, number> = {
  online: 1,
  degraded: 2,
  reconnecting: 3,
  offline: 4,
}

const PROTOTYPE_STATUSES: ConnectionStatusItem[] = [
  { label: 'Heartbeat', status: 'online' },
  { label: 'Match State Platform', status: 'online' },
  { label: 'Remote Data Store', status: 'online' },
]

function getSummaryStatus(
  statuses: ConnectionStatusItem[],
): ConnectionStatusKind {
  return statuses.reduce<ConnectionStatusKind>(
    (worst, item) =>
      STATUS_PRIORITY[item.status] > STATUS_PRIORITY[worst]
        ? item.status
        : worst,
    'online',
  )
}

function StatusDot({ className }: { className: string }) {
  return (
    <span
      className={cn('size-2 shrink-0 rounded-full', className)}
      aria-hidden
    />
  )
}

interface ConnectionStatusChipProps {
  /** Overall status shown on the chip. Derived from `statuses` when omitted. */
  summary?: ConnectionStatusKind
  /** Up to four named connection statuses shown in the dropdown. */
  statuses?: ConnectionStatusItem[]
}

export function ConnectionStatusChip({
  summary,
  statuses = PROTOTYPE_STATUSES,
}: ConnectionStatusChipProps) {
  const items = statuses.slice(0, 4)
  const summaryStatus = summary ?? getSummaryStatus(items)
  const summaryConfig = STATUS_STYLE[summaryStatus]
  const hasDropdown = items.length > 0

  const chip = (
    <span
      className={cn(
        'group/badge inline-flex h-7 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-4xl border px-2 py-0.5 text-xs font-medium whitespace-nowrap normal-case transition-all',
        summaryConfig.chipClassName,
        hasDropdown && 'cursor-pointer',
      )}
    >
      <StatusDot className={summaryConfig.dotClassName} />
      {summaryConfig.label}
      {hasDropdown ? (
        <ChevronDown className="size-3 opacity-60" aria-hidden />
      ) : null}
    </span>
  )

  if (!hasDropdown) {
    return chip
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        aria-label="Connection status details"
        className="rounded-4xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {chip}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          sideOffset={6}
          className="isolate z-[100]"
        >
          <Popover.Popup
            className={cn(
              'relative z-[100] min-w-[13.5rem] rounded-lg bg-popover p-1 text-popover-foreground shadow-md outline-none',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            )}
          >
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => {
                const config = STATUS_STYLE[item.status]
                return (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs"
                  >
                    <span className="font-medium text-foreground">
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 font-medium normal-case',
                        config.textClassName,
                      )}
                    >
                      <StatusDot className={config.dotClassName} />
                      {config.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
