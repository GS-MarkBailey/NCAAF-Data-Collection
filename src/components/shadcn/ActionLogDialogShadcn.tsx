import { Download, ScrollText } from 'lucide-react'
import {
  downloadActionLogCsv,
  formatActionGameClock,
  formatActionLabel,
  formatActionTime,
  formatActionType,
} from '@/lib/actionLog'
import { UiVariantSwitch } from '@/components/UiVariantSwitch'
import { useAppStore } from '@/store/gameStore'
import type { UserAction } from '@/types/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ActionLogDialogShadcnProps {
  fixtureId: string
}

const EMPTY_ACTIONS: UserAction[] = []

export function ActionLogDialogShadcn({ fixtureId }: ActionLogDialogShadcnProps) {
  const actions = useAppStore(
    (s) => s.actionLogs[fixtureId] ?? EMPTY_ACTIONS,
  )

  const reversed = [...actions].reverse()

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="icon" />}>
        <ScrollText />
        <span className="sr-only">Open console</span>
      </DialogTrigger>

      <DialogContent className="flex max-h-[min(80dvh,28rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-4 pt-4 pb-0">
          <DialogTitle>Console</DialogTitle>
          <DialogDescription>
            Action history and display options
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="log"
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <TabsList className="mx-4 mt-3 w-[calc(100%-2rem)]">
            <TabsTrigger value="log" className="flex-1">
              Action Log
            </TabsTrigger>
            <TabsTrigger value="display" className="flex-1">
              UI Variant
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="log"
            className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3 pb-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {actions.length} recorded action
                {actions.length === 1 ? '' : 's'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadActionLogCsv(actions, fixtureId)}
                disabled={actions.length === 0}
              >
                <Download data-icon="inline-start" />
                CSV
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {reversed.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No actions recorded yet.
                </p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {reversed.map((action) => (
                    <li
                      key={action.id}
                      className="rounded-lg border bg-muted/30 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline">
                          {formatActionType(action)}
                        </Badge>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="text-xs font-semibold tabular-nums">
                            {formatActionGameClock(action)}
                          </span>
                          <time
                            dateTime={action.timestamp}
                            className="text-xs tabular-nums text-muted-foreground"
                          >
                            {formatActionTime(action.timestamp)}
                          </time>
                        </div>
                      </div>
                      <p className="mt-2 text-sm font-medium">
                        {formatActionLabel(action)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </TabsContent>

          <TabsContent value="display" className="px-4 pt-3 pb-4">
            <UiVariantSwitch className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-3" />
            <p className="mt-3 text-sm text-muted-foreground">
              Switch between the custom operator UI and the shadcn component
              reference view. Your choice is saved for this session.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
