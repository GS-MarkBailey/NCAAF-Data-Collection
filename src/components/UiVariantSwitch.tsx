import { useEffect } from 'react'
import { Layers } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useUiStore } from '@/store/uiStore'

/** Keeps `data-ui-variant` on `<html>` in sync with persisted store state. */
export function UiVariantSync() {
  const variant = useUiStore((s) => s.variant)

  useEffect(() => {
    document.documentElement.dataset.uiVariant = variant
  }, [variant])

  return null
}

interface UiVariantSwitchProps {
  className?: string
}

export function UiVariantSwitch({ className }: UiVariantSwitchProps) {
  const variant = useUiStore((s) => s.variant)
  const setVariant = useUiStore((s) => s.setVariant)

  return (
    <div
      className={className}
      role="group"
      aria-label="UI variant"
    >
      <Layers className="size-4 shrink-0 text-muted-foreground" />
      <Label
        htmlFor="ui-variant-switch"
        className="cursor-pointer text-sm font-medium"
      >
        shadcn UI
      </Label>
      <Switch
        id="ui-variant-switch"
        checked={variant === 'shadcn'}
        onCheckedChange={(checked) =>
          setVariant(checked ? 'shadcn' : 'custom')
        }
        aria-label="Toggle shadcn UI variant"
      />
    </div>
  )
}
