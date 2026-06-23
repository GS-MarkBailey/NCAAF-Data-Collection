import { useState } from 'react'
import {
  FEATURE_FLAG_GROUPS,
  FEATURE_FLAGS,
  type FeatureFlagId,
} from '@/config/featureFlags'
import {
  useFeatureFlagStore,
  useFeatureFlagsDirty,
} from '@/store/featureFlagStore'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export function FeatureFlagsPanel() {
  const flags = useFeatureFlagStore((state) => state.flags)
  const savedDefaults = useFeatureFlagStore((state) => state.savedDefaults)
  const setFlag = useFeatureFlagStore((state) => state.setFlag)
  const confirmAsDefault = useFeatureFlagStore((state) => state.confirmAsDefault)
  const discardChanges = useFeatureFlagStore((state) => state.discardChanges)
  const resetToFactoryDefaults = useFeatureFlagStore(
    (state) => state.resetToFactoryDefaults,
  )
  const isEnabled = useFeatureFlagStore((state) => state.isEnabled)
  const isDirty = useFeatureFlagsDirty()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [factoryResetOpen, setFactoryResetOpen] = useState(false)

  const pendingCount = FEATURE_FLAGS.filter(
    ({ id }) => flags[id] !== savedDefaults[id],
  ).length

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="shrink-0 space-y-3">
          {isDirty ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {pendingCount} unsaved change{pendingCount === 1 ? '' : 's'} —
              previewing now, not yet saved as default.
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
              Current setup matches your saved default experience.
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {FEATURE_FLAG_GROUPS.map((group) => {
            const groupFlags = FEATURE_FLAGS.filter((flag) => flag.group === group)

            if (groupFlags.length === 0) return null

            return (
              <section key={group}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </h3>
                <ul className="divide-y divide-border rounded-lg border border-border bg-background">
                  {groupFlags.map((flag) => {
                    const parentId =
                      'parent' in flag ? (flag.parent as FeatureFlagId) : undefined
                    const parentDisabled =
                      parentId != null && !isEnabled(parentId)
                    const isPending = flags[flag.id] !== savedDefaults[flag.id]

                    return (
                      <li key={flag.id}>
                        <FeatureFlagRow
                          id={flag.id}
                          label={flag.label}
                          description={
                            'description' in flag ? flag.description : undefined
                          }
                          nested={parentId != null}
                          pending={isPending}
                          checked={flags[flag.id]}
                          disabled={parentDisabled}
                          onCheckedChange={(checked) => setFlag(flag.id, checked)}
                        />
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFactoryResetOpen(true)}
          >
            Factory reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={discardChanges}
            disabled={!isDirty}
          >
            Discard
          </Button>
          <Button size="sm" disabled={!isDirty} onClick={() => setConfirmOpen(true)}>
            Confirm as default
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Confirm default experience?</DialogTitle>
            <DialogDescription>
              This will save your current feature setup as the default for this
              browser. Reset and future sessions will start from this
              configuration.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                confirmAsDefault()
                setConfirmOpen(false)
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={factoryResetOpen} onOpenChange={setFactoryResetOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Reset to factory defaults?</DialogTitle>
            <DialogDescription>
              This restores the original built-in feature setup and saves it as
              your default experience.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFactoryResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetToFactoryDefaults()
                setFactoryResetOpen(false)
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function FeatureFlagRow({
  id,
  label,
  description,
  nested,
  pending,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: FeatureFlagId
  label: string
  description?: string
  nested: boolean
  pending: boolean
  checked: boolean
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 px-3 py-2.5',
        nested && 'pl-6',
        disabled && 'opacity-50',
        pending && 'bg-amber-50/70',
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          {pending ? (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Changed
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}
