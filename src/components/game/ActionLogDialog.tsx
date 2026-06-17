import { Download, Settings } from 'lucide-react'
import {
  downloadActionLogCsv,
  formatActionGameClock,
  formatActionLabel,
  formatActionTime,
  formatActionType,
} from '@/lib/actionLog'
import { UiVariantSwitchCustom } from '@/components/UiVariantSwitchCustom'
import { FieldDirectionPicker } from '@/components/game/FieldDirectionPicker'
import { useAppStore } from '@/store/gameStore'
import type { UserAction } from '@/types/actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ActionLogDialogProps {
  fixtureId: string
}

const EMPTY_ACTIONS: UserAction[] = []

const SETTINGS_DIALOG_HEIGHT = 'h-[min(80dvh,28rem)]'

const SETTINGS_TAB_CONTENT =
  'absolute inset-x-4 top-3 bottom-4 flex min-h-0 flex-col outline-none'

const SETTINGS_TAB_PANEL =
  'flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-[var(--color-panel-border)] bg-[var(--color-play-card-bg)] p-3'

const SETTINGS_TAB_SCROLL = 'min-h-0 flex-1 overflow-y-auto'

export function ActionLogDialog({ fixtureId }: ActionLogDialogProps) {
  const actions = useAppStore(
    (s) => s.actionLogs[fixtureId] ?? EMPTY_ACTIONS,
  )
  const game = useAppStore((s) => s.games[fixtureId])

  const reversed = [...actions].reverse()

  return (
    <Dialog>
      <DialogTrigger
        className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[var(--color-panel-border)] bg-[var(--color-panel)] text-[var(--color-text)] shadow-[var(--shadow-panel)] transition-colors active:bg-[var(--color-play-card-bg)]"
        aria-label="Open settings"
      >
        <Settings className="size-4" strokeWidth={2} />
      </DialogTrigger>

      <DialogContent
        className={`!flex ${SETTINGS_DIALOG_HEIGHT} w-full max-w-md max-h-[min(80dvh,28rem)] flex-col gap-0 overflow-hidden border-[var(--color-panel-border)] bg-[var(--color-panel)] p-0 sm:max-w-md`}
      >
        <div className="shrink-0 border-b border-[var(--color-panel-border)] px-4 pt-3 pr-12">
          <DialogTitle className="text-base font-semibold text-[var(--color-text)]">
            Settings
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--color-text-muted)]">
            Action log, field direction, and display options
          </DialogDescription>
        </div>

        <Tabs
          defaultValue="log"
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <TabsList className="mx-4 mt-3 w-[calc(100%-2rem)] shrink-0">
            <TabsTrigger value="log" className="flex-1">
              Log
            </TabsTrigger>
            <TabsTrigger value="field" className="flex-1">
              Field
            </TabsTrigger>
            <TabsTrigger value="display" className="flex-1">
              UI
            </TabsTrigger>
          </TabsList>

          <div className="relative min-h-0 flex-1">
            <TabsContent value="log" className={SETTINGS_TAB_CONTENT}>
              <div className={SETTINGS_TAB_PANEL}>
                <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {actions.length} recorded action
                    {actions.length === 1 ? '' : 's'}
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadActionLogCsv(actions, fixtureId)}
                    disabled={actions.length === 0}
                    className="flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] transition-colors enabled:active:bg-[var(--color-play-card-bg)] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Download action log as CSV"
                  >
                    <Download className="size-3.5" strokeWidth={2} />
                    CSV
                  </button>
                </div>

                <div className={SETTINGS_TAB_SCROLL}>
                  {reversed.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
                      No actions recorded yet.
                    </p>
                  ) : (
                    <ol className="flex flex-col gap-2">
                      {reversed.map((action) => (
                        <li
                          key={action.id}
                          className="rounded-[10px] border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex shrink-0 flex-col items-start gap-0.5">
                              <span className="text-[11px] font-semibold tabular-nums text-[var(--color-text)]">
                                {formatActionGameClock(action)}
                              </span>
                              <time
                                dateTime={action.timestamp}
                                className="text-[11px] tabular-nums text-[var(--color-text-muted)]"
                              >
                                {formatActionTime(action.timestamp)}
                              </time>
                            </div>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                              {formatActionType(action)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm font-medium text-[var(--color-text)]">
                            {formatActionLabel(action)}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="field" className={SETTINGS_TAB_CONTENT}>
              <div className={SETTINGS_TAB_PANEL}>
                <div className={SETTINGS_TAB_SCROLL}>
                  {game ? (
                    <FieldDirectionPicker
                      fixtureId={fixtureId}
                      homeAbbr={game.fixture.homeAbbr}
                      homeAttacksRight={game.homeAttacksRight}
                      variant="custom"
                    />
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Load a fixture to set field direction.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="display" className={SETTINGS_TAB_CONTENT}>
              <div className={SETTINGS_TAB_PANEL}>
                <div className={SETTINGS_TAB_SCROLL}>
                  <UiVariantSwitchCustom />
                  <p className="mt-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
                    Switch between the custom operator UI and the shadcn component
                    reference view. Your choice is saved for this session.
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
