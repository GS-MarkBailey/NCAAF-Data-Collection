import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type ConnectionSubstatus =
  | 'online'
  | 'offline'
  | 'reconnecting'
  | 'degraded'

const SUBSTATUS_OPTIONS: {
  id: ConnectionSubstatus
  label: string
  dotClassName: string
  chipClassName: string
}[] = [
  {
    id: 'online',
    label: 'online',
    dotClassName: 'bg-emerald-500',
    chipClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  {
    id: 'offline',
    label: 'offline',
    dotClassName: 'bg-red-500',
    chipClassName: 'border-red-200 bg-red-50 text-red-800',
  },
  {
    id: 'reconnecting',
    label: 'reconnecting',
    dotClassName: 'bg-amber-500',
    chipClassName: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  {
    id: 'degraded',
    label: 'degraded',
    dotClassName: 'bg-orange-500',
    chipClassName: 'border-orange-200 bg-orange-50 text-orange-900',
  },
]

const SUBSTATUS_BY_ID = Object.fromEntries(
  SUBSTATUS_OPTIONS.map((option) => [option.id, option]),
) as Record<ConnectionSubstatus, (typeof SUBSTATUS_OPTIONS)[number]>

function StatusIndicator({
  label,
  dotClassName,
}: {
  label: string
  dotClassName: string
}) {
  return (
    <>
      <span
        className={cn('size-2 shrink-0 rounded-full', dotClassName)}
        aria-hidden
      />
      {label}
    </>
  )
}

interface ConnectionStatusChipProps {
  status?: ConnectionSubstatus
  onStatusChange?: (status: ConnectionSubstatus) => void
}

export function ConnectionStatusChip({
  status: statusProp,
  onStatusChange,
}: ConnectionStatusChipProps) {
  const [internalStatus, setInternalStatus] =
    useState<ConnectionSubstatus>('online')
  const status = statusProp ?? internalStatus
  const config = SUBSTATUS_BY_ID[status]

  const handleChange = (value: ConnectionSubstatus | null) => {
    if (!value) return
    setInternalStatus(value)
    onStatusChange?.(value)
  }

  return (
    <Select value={status} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        aria-label="Connection status"
        className={cn(
          'h-7 gap-1.5 border px-2 text-xs font-medium normal-case shadow-none',
          config.chipClassName,
        )}
      >
        <SelectValue>
          <StatusIndicator
            label={config.label}
            dotClassName={config.dotClassName}
          />
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="min-w-[9.5rem]">
        {SUBSTATUS_OPTIONS.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            <StatusIndicator
              label={option.label}
              dotClassName={option.dotClassName}
            />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
