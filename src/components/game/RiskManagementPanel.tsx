import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GameState, RiskType } from '@/types'

const RISKS: { key: RiskType; label: string; fullWidth?: boolean }[] = [
  { key: 'challengeReview', label: 'Challenge / Review' },
  { key: 'statDelay', label: 'Stat Delay' },
  { key: 'bigPlay', label: 'Big Play' },
  { key: 'penalty', label: 'Penalty' },
  { key: 'touchdown', label: 'Touchdown', fullWidth: true },
]

interface RiskManagementPanelProps {
  game: GameState
  onToggleRisk: (risk: RiskType) => void
}

export function RiskManagementPanel({
  game,
  onToggleRisk,
}: RiskManagementPanelProps) {
  return (
    <section className="panel-shell">
      <div className="panel-header">
        <AlertTriangle className="size-4" strokeWidth={2} />
        <h2>Risk Management</h2>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-2">
        {RISKS.map(({ key, label, fullWidth }) => {
          const active = game.risks[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggleRisk(key)}
              className={cn(
                'flex h-full min-h-0 items-center justify-center rounded-[10px] px-2 text-[13px] font-semibold leading-tight transition-colors active:scale-[0.98] landscape-mobile:text-xs',
                fullWidth && 'col-span-2',
                active
                  ? 'bg-[var(--color-danger)] text-white'
                  : 'bg-[var(--color-risk-bg)] text-[var(--color-text)] hover:bg-[var(--color-risk-hover)]',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
