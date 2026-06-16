import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GameState, RiskType } from '@/types'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const RISKS: { key: RiskType; label: string; fullWidth?: boolean }[] = [
  { key: 'challengeReview', label: 'Challenge / Review' },
  { key: 'statDelay', label: 'Unreliable' },
  { key: 'bigPlay', label: 'Big Play' },
  { key: 'penalty', label: 'Penalty' },
  { key: 'touchdown', label: 'Touchdown', fullWidth: true },
]

interface RiskManagementPanelShadcnProps {
  game: GameState
  onToggleRisk: (risk: RiskType) => void
}

export function RiskManagementPanelShadcn({
  game,
  onToggleRisk,
}: RiskManagementPanelShadcnProps) {
  const activeValues = RISKS.filter(({ key }) => game.risks[key]).map(
    ({ key }) => key,
  )

  const handleValueChange = (values: string[]) => {
    for (const { key } of RISKS) {
      const wasActive = game.risks[key]
      const isActive = values.includes(key)
      if (wasActive !== isActive) onToggleRisk(key)
    }
  }

  return (
    <Card size="compact" className="flex min-h-0 flex-1 flex-col">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="size-4 text-muted-foreground" />
          Risk Management
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <ToggleGroup
          multiple
          variant="outline"
          spacing={2}
          value={activeValues}
          onValueChange={handleValueChange}
          aria-label="Risk flags"
          className="grid h-full min-h-0 w-full grid-cols-2 grid-rows-3 gap-2"
        >
          {RISKS.map(({ key, label, fullWidth }) => (
            <ToggleGroupItem
              key={key}
              value={key}
              className={cn(
                'h-full min-h-12 w-full justify-center whitespace-normal px-2 text-center text-sm leading-tight landscape-mobile:text-xs',
                'data-pressed:border-destructive data-pressed:bg-destructive data-pressed:text-white',
                fullWidth && 'col-span-2',
              )}
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardContent>
    </Card>
  )
}
