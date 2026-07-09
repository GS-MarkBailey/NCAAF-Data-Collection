import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isFeatureEnabled, RISK_FEATURE_FLAGS } from '@/config/featureFlags'
import type { GameState, RiskType } from '@/types'
import { useFeatureFlagStore } from '@/store/featureFlagStore'
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
  { key: 'touchdown', label: 'Touchdown' },
  { key: 'playAboutToStart', label: 'Play About to Start' },
]

const STANDARD_RISK_ITEM_CLASS = cn(
  'h-full w-full justify-center whitespace-normal px-2 text-center leading-tight',
  'border-border bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]',
  'data-pressed:border-destructive data-pressed:bg-destructive data-pressed:text-white data-pressed:hover:bg-destructive',
)

const UNRELIABLE_RISK_ITEM_CLASS = cn(
  STANDARD_RISK_ITEM_CLASS,
  'border-amber-500/70 bg-amber-50 text-amber-950 shadow-sm',
  'hover:bg-amber-100',
  'dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-950/55',
  'data-pressed:border-amber-700 data-pressed:bg-amber-600 data-pressed:text-white data-pressed:hover:bg-amber-600',
  'ring-1 ring-inset ring-amber-500/20',
  'font-semibold',
)

function getRiskGridRowCount(
  standardCount: number,
  hasUnreliable: boolean,
): number {
  if (standardCount === 0) return hasUnreliable ? 1 : 1

  if (!hasUnreliable) {
    return Math.max(1, Math.ceil(standardCount / 2))
  }

  return standardCount % 2 === 0
    ? standardCount / 2 + 1
    : Math.ceil(standardCount / 2)
}

const PORTRAIT_PANEL_CLASS = 'min-h-0 flex-1 border border-border ring-0'

interface RiskManagementPanelShadcnProps {
  game: GameState
  layout?: 'stack' | 'column'
  onToggleRisk: (risk: RiskType) => void
}

export function RiskManagementPanelShadcn({
  game,
  layout = 'column',
  onToggleRisk,
}: RiskManagementPanelShadcnProps) {
  const flags = useFeatureFlagStore((state) => state.flags)
  const visibleRisks = useMemo(
    () =>
      RISKS.filter(({ key }) =>
        isFeatureEnabled(flags, RISK_FEATURE_FLAGS[key]),
      ),
    [flags],
  )
  const standardRisks = useMemo(
    () => visibleRisks.filter(({ key }) => key !== 'statDelay'),
    [visibleRisks],
  )
  const unreliableRisk = useMemo(
    () => visibleRisks.find(({ key }) => key === 'statDelay'),
    [visibleRisks],
  )
  const activeValues = visibleRisks.filter(({ key }) => game.risks[key]).map(
    ({ key }) => key,
  )
  const rowCount = getRiskGridRowCount(
    standardRisks.length,
    Boolean(unreliableRisk),
  )
  const stacked = layout === 'stack'
  const portraitPanelClass = PORTRAIT_PANEL_CLASS

  const handleValueChange = (values: string[]) => {
    for (const { key } of visibleRisks) {
      const wasActive = game.risks[key]
      const isActive = values.includes(key)
      if (wasActive !== isActive) onToggleRisk(key)
    }
  }

  return (
    <Card
      size="compact"
      className={cn(
        'flex min-h-0 flex-1 flex-col',
        stacked && portraitPanelClass,
      )}
    >
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="size-4 text-muted-foreground" />
          Risk Management
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {visibleRisks.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-2 text-center text-sm text-muted-foreground">
            All risk flags are disabled in Settings → Features.
          </p>
        ) : (
          <ToggleGroup
            multiple
            variant="outline"
            spacing={2}
            value={activeValues}
            onValueChange={handleValueChange}
            aria-label="Risk flags"
            className="grid h-full min-h-0 w-full grid-cols-2 gap-2"
            style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
          >
            {standardRisks.map(({ key, label, fullWidth }) => (
              <ToggleGroupItem
                key={key}
                value={key}
                className={cn(
                  STANDARD_RISK_ITEM_CLASS,
                  stacked
                    ? 'min-h-11 text-xs'
                    : 'min-h-12 text-sm landscape-mobile:text-xs',
                  fullWidth && 'col-span-2',
                )}
              >
                {label}
              </ToggleGroupItem>
            ))}
            {unreliableRisk ? (
              <ToggleGroupItem
                key={unreliableRisk.key}
                value={unreliableRisk.key}
                style={{ gridColumn: 2, gridRow: rowCount }}
                className={cn(
                  UNRELIABLE_RISK_ITEM_CLASS,
                  stacked
                    ? 'min-h-11 text-xs'
                    : 'min-h-12 text-sm landscape-mobile:text-xs',
                )}
              >
                {unreliableRisk.label}
              </ToggleGroupItem>
            ) : null}
          </ToggleGroup>
        )}
      </CardContent>
    </Card>
  )
}
