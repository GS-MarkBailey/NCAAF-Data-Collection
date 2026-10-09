import { Download, ListTree } from 'lucide-react'
import { formatPeriodLabel } from '@/lib/football'
import { downloadEventsLogCsv } from '@/lib/eventsLog'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { useAppStore } from '@/store/gameStore'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface CollectedDatapointsDialogShadcnProps {
  fixtureId: string
}

export function CollectedDatapointsDialogShadcn({
  fixtureId,
}: CollectedDatapointsDialogShadcnProps) {
  const datapoints = useAppStore(
    (s) => s.games[fixtureId]?.collectedDatapoints ?? [],
  )
  const rulesetId = useAppStore((s) => s.games[fixtureId]?.rulesetId)
  const showCsvExport = useFeatureFlag('settings.csvExport')

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            title="Collected datapoints"
          />
        }
      >
        <ListTree />
        <span className="sr-only">Collected datapoints</span>
      </DialogTrigger>

      <DialogContent className="flex max-h-[min(80dvh,32rem)] flex-col gap-0 overflow-hidden sm:max-w-md">
        <DialogHeader className="shrink-0 border-b border-border px-1 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <DialogTitle>Collected datapoints</DialogTitle>
              <DialogDescription>
                {datapoints.length === 0
                  ? 'No datapoints collected yet this session.'
                  : `${datapoints.length} datapoint${datapoints.length === 1 ? '' : 's'} this session`}
              </DialogDescription>
            </div>
            {showCsvExport ? (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={datapoints.length === 0}
                title="Download events log CSV"
                onClick={() => downloadEventsLogCsv(datapoints, fixtureId)}
              >
                <Download data-icon="inline-start" />
                CSV
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-3">
          {datapoints.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">
              Kick off and collect plays — each choice, yard press, risk
              toggle, and undo appears here, newest first.
            </p>
          ) : (
            <ol className="flex flex-col gap-1.5" reversed>
              {[...datapoints].reverse().map((entry, index) => {
                const isUndo = entry.key === 'undo'
                // Newest first; numbers keep collection order (n … 1).
                const orderNumber = datapoints.length - index
                return (
                  <li
                    key={entry.id}
                    className={
                      isUndo
                        ? 'flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2'
                        : 'flex items-center gap-2 rounded-lg border border-border px-3 py-2'
                    }
                  >
                    <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {orderNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          isUndo
                            ? 'truncate text-sm font-medium tracking-wide text-muted-foreground'
                            : 'truncate text-sm font-semibold tracking-wide'
                        }
                      >
                        {entry.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        Q{formatPeriodLabel(entry.period, rulesetId)} ·{' '}
                        {entry.clock}
                      </p>
                    </div>
                    <Badge
                      variant={isUndo ? 'outline' : 'secondary'}
                      className="shrink-0 text-[10px]"
                    >
                      {entry.key}
                    </Badge>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
