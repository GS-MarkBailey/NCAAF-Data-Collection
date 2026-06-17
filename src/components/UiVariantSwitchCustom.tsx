import { Layers } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useUiStore } from '@/store/uiStore'

export function UiVariantSwitchCustom() {
  const variant = useUiStore((s) => s.variant)
  const setVariant = useUiStore((s) => s.setVariant)

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--color-panel-border)] bg-[var(--color-play-card-bg)] px-3 py-2.5"
      role="group"
      aria-label="UI variant"
    >
      <div className="flex items-center gap-2">
        <Layers className="size-4 text-[var(--color-text-muted)]" />
        <Label
          htmlFor="ui-variant-switch-custom"
          className="cursor-pointer text-sm font-medium text-[var(--color-text)]"
        >
          shadcn UI
        </Label>
      </div>
      <Switch
        id="ui-variant-switch-custom"
        checked={variant === 'shadcn'}
        onCheckedChange={(checked) =>
          setVariant(checked ? 'shadcn' : 'custom')
        }
        aria-label="Toggle shadcn UI variant"
      />
    </div>
  )
}
