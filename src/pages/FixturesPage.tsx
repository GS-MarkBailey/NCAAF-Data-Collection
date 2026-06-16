import { useNavigate } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { FixturesPageShadcn } from '@/pages/shadcn/FixturesPageShadcn'
import { useAppStore } from '@/store/gameStore'
import { useUiStore } from '@/store/uiStore'

export function FixturesPage() {
  const variant = useUiStore((s) => s.variant)

  if (variant === 'shadcn') {
    return <FixturesPageShadcn />
  }

  return <FixturesPageCustom />
}

function FixturesPageCustom() {
  const navigate = useNavigate()
  const fixtures = useAppStore((s) => s.fixtures)
  const initGame = useAppStore((s) => s.initGame)

  const openFixture = (fixtureId: string) => {
    initGame(fixtureId)
    navigate(`/game/${fixtureId}`)
  }

  return (
    <div className="flex h-dvh flex-col bg-[var(--color-app-bg)] safe-x safe-b">
      <header className="shrink-0 px-1 py-4">
        <h1 className="text-lg font-bold text-[var(--color-text)]">Fixtures</h1>
        <p className="text-xs text-[var(--color-text-muted)]">
          Select a match to open the data collection console
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
        {fixtures.map((fixture) => (
          <button
            key={fixture.id}
            type="button"
            onClick={() => openFixture(fixture.id)}
            className="flex w-full shrink-0 flex-col rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4 text-left shadow-[var(--shadow-panel)] transition-colors active:bg-[var(--color-play-card-bg)]"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-sm font-semibold text-[var(--color-text)]">
                  {fixture.homeTeam}
                </span>
                <span className="shrink-0 text-xs text-[var(--color-text-muted)]">vs</span>
                <span className="truncate text-sm font-semibold text-[var(--color-text)]">
                  {fixture.awayTeam}
                </span>
              </div>
              <span className="shrink-0 rounded-md bg-[var(--color-time-pill)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--color-time-pill-text)]">
                #{fixture.eventId}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <Calendar className="size-3.5" />
              {fixture.startDate} · {fixture.startTime}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
