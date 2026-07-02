import { type CSSProperties } from 'react'
import { LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/format'
import {
  isAwaitingQuarterStart,
  isRegulationComplete,
  nextQuarterNumber,
} from '@/lib/clock'
import { usePushPulse } from '@/hooks/usePushPulse'
import { useAppStore } from '@/store/gameStore'
import { getEffectiveHomeAttacksRight } from '@/lib/playSimulation'
import { BallOnStatCell } from '@/components/game/BallOnStatCell'

interface ScoreboardPanelProps {
  fixtureId: string
}

export function ScoreboardPanel({ fixtureId }: ScoreboardPanelProps) {
  const clockSeconds = useAppStore((s) => s.games[fixtureId]?.clock.seconds ?? 0)
  const clockRunning = useAppStore((s) => s.games[fixtureId]?.clock.running ?? false)
  const clockPeriod = useAppStore((s) => s.games[fixtureId]?.clock.period ?? 1)
  const gameStarted = useAppStore((s) => s.games[fixtureId]?.gameStarted ?? false)
  const down = useAppStore((s) => s.games[fixtureId]?.down ?? 1)
  const distance = useAppStore((s) => s.games[fixtureId]?.distance ?? 10)
  const ballOn = useAppStore((s) => s.games[fixtureId]?.ballOn ?? 25)
  const possessionIsHome = useAppStore(
    (s) => s.games[fixtureId]?.possessionIsHome ?? true,
  )
  const offenseIsHome = useAppStore(
    (s) =>
      s.games[fixtureId]?.simulation?.offenseIsHome ??
      s.games[fixtureId]?.possessionIsHome ??
      true,
  )
  const homeAbbr = useAppStore((s) => s.games[fixtureId]?.fixture.homeAbbr ?? '')
  const awayAbbr = useAppStore((s) => s.games[fixtureId]?.fixture.awayAbbr ?? '')
  const homeAttacksRightBase = useAppStore(
    (s) => s.games[fixtureId]?.homeAttacksRight ?? false,
  )
  const homeAttacksRight = getEffectiveHomeAttacksRight(
    homeAttacksRightBase,
    clockPeriod,
  )

  const toggleClock = useAppStore((s) => s.toggleClock)
  const adjustClock = useAppStore((s) => s.adjustClock)
  const startPeriod = useAppStore((s) => s.startPeriod)
  const setPossession = useAppStore((s) => s.setPossession)

  const paused = !clockRunning
  const pregame = !gameStarted
  const awaitingQuarterStart = isAwaitingQuarterStart(
    {
      seconds: clockSeconds,
      period: clockPeriod,
    },
    gameStarted,
  )
  const regulationComplete = isRegulationComplete({
    seconds: clockSeconds,
    period: clockPeriod,
  })

  const handleClockPress = () => {
    if (pregame || awaitingQuarterStart) {
      startPeriod(fixtureId)
      return
    }
    toggleClock(fixtureId)
  }

  return (
    <section className="panel-shell">
      <div className="panel-header">
        <LayoutGrid className="size-4" strokeWidth={2} />
        <h2>Scoreboard</h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex min-h-0 flex-1">
          <div className="flex h-full w-full items-center overflow-hidden rounded-[10px] border border-[var(--color-panel-border)] bg-[var(--color-panel)]">
            <button
              type="button"
              onClick={() => adjustClock(fixtureId, -1)}
              className="flex h-full w-10 shrink-0 items-center justify-center border-r border-[var(--color-panel-border)] text-3xl font-light text-[var(--color-text-muted)] transition-colors active:bg-[var(--color-primary-bg)]"
              aria-label="Decrease clock by 1 second"
            >
              −
            </button>

            <button
              type="button"
              onClick={handleClockPress}
              disabled={regulationComplete}
              className={cn(
                'flex h-full flex-1 flex-col items-center justify-center border-r border-[var(--color-panel-border)] px-3 py-2 transition-colors active:opacity-80',
                awaitingQuarterStart && 'bg-[var(--color-primary-bg)]',
                regulationComplete && 'bg-[var(--color-primary-bg)]',
                paused &&
                  !awaitingQuarterStart &&
                  !regulationComplete &&
                  'bg-[var(--color-clock-paused-bg)]',
              )}
              aria-label={
                awaitingQuarterStart
                  ? `Start quarter ${nextQuarterNumber(clockPeriod)}`
                  : paused
                    ? 'Start clock'
                    : 'Pause clock'
              }
              aria-pressed={!paused && !awaitingQuarterStart && !regulationComplete}
            >
              <span className="text-[2rem] font-bold leading-none tracking-tight text-[var(--color-text)]">
                {formatClock(clockSeconds)}
              </span>
              {awaitingQuarterStart && (
                <span className="mt-1.5 rounded-full border border-[var(--color-primary-border)] bg-[var(--color-primary-chip-bg)] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[var(--color-primary-chip-text)]">
                  START Q{nextQuarterNumber(clockPeriod)}
                </span>
              )}
              {regulationComplete && (
                <span className="mt-1.5 rounded-full bg-[var(--color-score-bg)] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white">
                  END OF REGULATION
                </span>
              )}
              {paused && !awaitingQuarterStart && !regulationComplete && (
                <span className="mt-1.5 rounded-full bg-[var(--color-danger)] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white">
                  PAUSED
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => adjustClock(fixtureId, 1)}
              className="flex h-full w-10 shrink-0 items-center justify-center text-3xl font-light text-[var(--color-text-muted)] transition-colors active:bg-[var(--color-primary-bg)]"
              aria-label="Increase clock by 1 second"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex h-full w-full flex-col overflow-hidden rounded-[10px] border border-[var(--color-panel-border)] bg-[var(--color-panel)]">
            <div className="flex shrink-0 items-stretch">
              <StatCell label="QTR" value={clockPeriod} />
              <StatCell label="DOWN" value={down} />
              <StatCell label="TO GO" value={distance} />
              <BallOnStatCell
                ballOn={ballOn}
                offenseIsHome={offenseIsHome}
                homeAttacksRight={homeAttacksRight}
              />
            </div>
            <PossessionSwitch
              awayAbbr={awayAbbr}
              homeAbbr={homeAbbr}
              possessionIsHome={possessionIsHome}
              onSelect={(isHome) => setPossession(fixtureId, isHome)}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function StatCell({ label, value }: { label: string; value: number }) {
  const pulsing = usePushPulse(value)

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-1 flex-col items-center justify-center border-r border-[var(--color-panel-border)] px-1 py-4 last:border-r-0 landscape-mobile:py-3',
        pulsing && 'push-data-pulse',
      )}
      style={{ '--push-pulse-end': 'var(--color-panel)' } as CSSProperties}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </span>
      <span className="mt-1 text-2xl font-bold leading-none text-[var(--color-text)] landscape-mobile:text-xl">
        {value}
      </span>
    </div>
  )
}

interface PossessionSwitchProps {
  awayAbbr: string
  homeAbbr: string
  possessionIsHome: boolean
  onSelect: (possessionIsHome: boolean) => void
}

function PossessionSwitch({
  awayAbbr,
  homeAbbr,
  possessionIsHome,
  onSelect,
}: PossessionSwitchProps) {
  return (
    <div className="flex min-h-0 flex-1 w-full border-t border-[var(--color-panel-border)]">
      <PossessionOption
        label={homeAbbr}
        active={possessionIsHome}
        onClick={() => onSelect(true)}
        ariaLabel={`Give possession to ${homeAbbr}`}
      />
      <PossessionOption
        label={awayAbbr}
        active={!possessionIsHome}
        onClick={() => onSelect(false)}
        ariaLabel={`Give possession to ${awayAbbr}`}
        isLast
      />
    </div>
  )
}

function PossessionOption({
  label,
  active,
  onClick,
  ariaLabel,
  isLast,
}: {
  label: string
  active: boolean
  onClick: () => void
  ariaLabel: string
  isLast?: boolean
}) {
  const pulsing = usePushPulse(active)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        'flex h-full min-h-0 flex-1 items-center justify-center transition-colors active:opacity-80',
        !isLast && 'border-r border-[var(--color-panel-border)]',
        active
          ? 'bg-[var(--color-score-bg)] text-white'
          : 'bg-[var(--color-panel)] text-[var(--color-text)]',
        pulsing && active && 'push-data-pulse',
      )}
      style={
        active
          ? ({ '--push-pulse-end': 'var(--color-score-bg)' } as CSSProperties)
          : undefined
      }
    >
      <span className="text-lg font-bold leading-none landscape-mobile:text-base">
        {label}
      </span>
    </button>
  )
}
