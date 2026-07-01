import { useState } from 'react'
import {
  FEATURE_FLAG_BY_ID,
  FEATURE_FLAG_GROUPS,
  FEATURE_FLAGS,
  type FeatureFlagId,
} from '@/config/featureFlags'
import { FeatureFlagDeployError } from '@/lib/featureFlagDeploy'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export function FeatureFlagsPanel() {
  const flags = useFeatureFlagStore((state) => state.flags)
  const deployedDefaults = useFeatureFlagStore((state) => state.deployedDefaults)
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
  const [deployPassphrase, setDeployPassphrase] = useState('')
  const [deployError, setDeployError] = useState<string | null>(null)
  const [deploying, setDeploying] = useState(false)

  const pendingCount = FEATURE_FLAGS.filter(
    ({ id }) => flags[id] !== deployedDefaults[id],
  ).length

  const handleConfirmDeploy = async () => {
    setDeployError(null)
    setDeploying(true)
    try {
      await confirmAsDefault(deployPassphrase)
      setConfirmOpen(false)
      setDeployPassphrase('')
    } catch (error) {
      setDeployError(
        error instanceof FeatureFlagDeployError
          ? error.message
          : 'Unable to deploy feature flag defaults.',
      )
    } finally {
      setDeploying(false)
    }
  }

  const handleFactoryReset = async () => {
    setDeployError(null)
    setDeploying(true)
    try {
      await resetToFactoryDefaults(deployPassphrase)
      setFactoryResetOpen(false)
      setDeployPassphrase('')
    } catch (error) {
      setDeployError(
        error instanceof FeatureFlagDeployError
          ? error.message
          : 'Unable to deploy factory defaults.',
      )
    } finally {
      setDeploying(false)
    }
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
        <div className="flex flex-col gap-3 pr-1">
          <div className="space-y-3">
            {isDirty ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {pendingCount} unsaved change{pendingCount === 1 ? '' : 's'} —
                previewing now, not yet deployed as the app default.
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                Current setup matches the deployed app default on Vercel.
              </div>
            )}
          </div>

          <div className="space-y-4">
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
                    const lockedOn = flag.id === 'header.settings'
                    const configured = flags[flag.id]
                    const effective = isEnabled(flag.id)
                    const inactiveInApp = configured && !effective
                    const isPending = configured !== deployedDefaults[flag.id]
                    const inactiveHint =
                      inactiveInApp && parentId
                        ? `Saved on, but hidden in app until ${FEATURE_FLAG_BY_ID[parentId].label} is enabled.`
                        : inactiveInApp
                          ? 'Saved on, but hidden in app until its parent feature is enabled.'
                          : undefined

                    return (
                      <li key={flag.id}>
                        <FeatureFlagRow
                          id={flag.id}
                          label={flag.label}
                          description={
                            lockedOn
                              ? 'Always enabled so settings stay accessible.'
                              : inactiveHint ??
                                ('description' in flag ? flag.description : undefined)
                          }
                          nested={parentId != null}
                          pending={isPending}
                          inactiveInApp={inactiveInApp}
                          checked={configured}
                          disabled={lockedOn}
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

          <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background px-1 pt-3 pb-1">
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
            <Button
              size="sm"
              disabled={!isDirty}
              onClick={() => setConfirmOpen(true)}
              className="bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:bg-secondary disabled:text-secondary-foreground disabled:opacity-100"
            >
              Confirm & deploy
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) {
            setDeployError(null)
            setDeployPassphrase('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Deploy feature defaults?</DialogTitle>
            <DialogDescription>
              This saves your current feature setup as the app default, commits
              it to GitHub, and triggers a new Vercel deployment for everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="deploy-passphrase">Deploy passphrase</Label>
            <Input
              id="deploy-passphrase"
              type="password"
              autoComplete="off"
              placeholder="Required on production if configured"
              value={deployPassphrase}
              onChange={(event) => setDeployPassphrase(event.target.value)}
            />
            {deployError ? (
              <p className="text-sm text-destructive">{deployError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deploying}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleConfirmDeploy()}
              disabled={deploying}
              className="bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
            >
              {deploying ? 'Deploying…' : 'Confirm & deploy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={factoryResetOpen}
        onOpenChange={(open) => {
          setFactoryResetOpen(open)
          if (!open) {
            setDeployError(null)
            setDeployPassphrase('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Reset to factory defaults?</DialogTitle>
            <DialogDescription>
              This restores the original built-in feature setup and deploys it
              to Vercel as the new app default.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="factory-deploy-passphrase">Deploy passphrase</Label>
            <Input
              id="factory-deploy-passphrase"
              type="password"
              autoComplete="off"
              placeholder="Required on production if configured"
              value={deployPassphrase}
              onChange={(event) => setDeployPassphrase(event.target.value)}
            />
            {deployError ? (
              <p className="text-sm text-destructive">{deployError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFactoryResetOpen(false)}
              disabled={deploying}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleFactoryReset()}
              disabled={deploying}
            >
              {deploying ? 'Deploying…' : 'Reset & deploy'}
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
  inactiveInApp,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: FeatureFlagId
  label: string
  description?: string
  nested: boolean
  pending: boolean
  inactiveInApp: boolean
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
        inactiveInApp && !pending && 'bg-muted/40',
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          {pending ? (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Changed
            </span>
          ) : null}
          {inactiveInApp ? (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Inactive in app
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
