import {
  FEATURE_FLAG_GROUPS,
  FEATURE_FLAGS,
  type FeatureFlagId,
} from '@/config/featureFlags'
import { useFeatureFlagStore } from '@/store/featureFlagStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export function FeatureFlagsPanel() {
  const flags = useFeatureFlagStore((state) => state.flags)
  const setFlag = useFeatureFlagStore((state) => state.setFlag)
  const resetFlags = useFeatureFlagStore((state) => state.resetFlags)
  const isEnabled = useFeatureFlagStore((state) => state.isEnabled)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Toggle components and sub-features for prototyping. Saved in this
          browser.
        </p>
        <Button variant="outline" size="sm" onClick={resetFlags}>
          Reset
        </Button>
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

                  return (
                    <li key={flag.id}>
                      <FeatureFlagRow
                        id={flag.id}
                        label={flag.label}
                        description={'description' in flag ? flag.description : undefined}
                        nested={parentId != null}
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
    </div>
  )
}

function FeatureFlagRow({
  id,
  label,
  description,
  nested,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: FeatureFlagId
  label: string
  description?: string
  nested: boolean
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
      )}
    >
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
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
