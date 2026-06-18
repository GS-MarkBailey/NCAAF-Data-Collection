import { Download, Settings } from 'lucide-react'
import {
  downloadActionLogCsv,
  formatActionGameClock,
  formatActionLabel,
  formatActionTime,
  formatActionType,
} from '@/lib/actionLog'
import { FieldDirectionPicker } from '@/components/game/FieldDirectionPicker'
import { FeatureFlagsPanel } from '@/components/shadcn/FeatureFlagsPanel'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
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

const SETTINGS_DIALOG_HEIGHT = 'h-[min(80dvh,28rem)]'

const SETTINGS_TAB_CONTENT =
  'absolute inset-x-4 top-3 bottom-4 flex min-h-0 flex-col outline-none'

const SETTINGS_TAB_PANEL =
  'flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-muted/30 p-3'

const SETTINGS_TAB_SCROLL = 'min-h-0 flex-1 overflow-y-auto'

export function ActionLogDialogShadcn({ fixtureId }: ActionLogDialogShadcnProps) {
  const actions = useAppStore(
    (s) => s.actionLogs[fixtureId] ?? EMPTY_ACTIONS,
  )
  const game = useAppStore((s) => s.games[fixtureId])
  const showFieldTab = useFeatureFlag('settings.fieldDirection')
  const showLogTab = useFeatureFlag('settings.actionLog')
  const showCsvExport = useFeatureFlag('settings.csvExport')
  const defaultTab = showFieldTab ? 'field' : showLogTab ? 'log' : 'features'

  const reversed = [...actions].reverse()

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="icon" />}>
        <Settings />
        <span className="sr-only">Open settings</span>
      </DialogTrigger>

      <DialogContent
        className={`flex ${SETTINGS_DIALOG_HEIGHT} max-h-[min(80dvh,28rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md`}
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 pt-4 pb-0">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Field direction, action log, and feature flags
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue={defaultTab}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <TabsList className="mx-4 mt-3 w-[calc(100%-2rem)] shrink-0">
            {showFieldTab ? (
              <TabsTrigger value="field" className="flex-1">
                Field
              </TabsTrigger>
            ) : null}
            {showLogTab ? (
              <TabsTrigger value="log" className="flex-1">
                Log
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="features" className="flex-1">
              Features
            </TabsTrigger>
          </TabsList>

          <div className="relative min-h-0 flex-1">
            {showFieldTab ? (
              <TabsContent value="field" className={SETTINGS_TAB_CONTENT}>
                <div className={SETTINGS_TAB_PANEL}>
                  <div className={SETTINGS_TAB_SCROLL}>
                    {game ? (
                      <FieldDirectionPicker
                        fixtureId={fixtureId}
                        homeAbbr={game.fixture.homeAbbr}
                        homeAttacksRight={game.homeAttacksRight}
                        variant="shadcn"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Load a fixture to set field direction.
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
            ) : null}

            {showLogTab ? (
              <TabsContent value="log" className={SETTINGS_TAB_CONTENT}>
                <div className={SETTINGS_TAB_PANEL}>
                  <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {actions.length} recorded action
                      {actions.length === 1 ? '' : 's'}
                    </p>
                    {showCsvExport ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadActionLogCsv(actions, fixtureId)}
                        disabled={actions.length === 0}
                      >
                        <Download data-icon="inline-start" />
                        CSV
                      </Button>
                    ) : null}
                  </div>

                  <div className={SETTINGS_TAB_SCROLL}>
                    {reversed.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No actions recorded yet.
                      </p>
                    ) : (
                      <ol className="flex flex-col gap-2">
                        {reversed.map((action) => (
                          <li
                            key={action.id}
                            className="rounded-lg border border-border bg-background p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex shrink-0 flex-col items-start gap-0.5">
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
                              <Badge variant="outline">
                                {formatActionType(action)}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm font-medium">
                              {formatActionLabel(action)}
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              </TabsContent>
            ) : null}

            <TabsContent value="features" className={SETTINGS_TAB_CONTENT}>
              <div className={SETTINGS_TAB_PANEL}>
                <FeatureFlagsPanel />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
