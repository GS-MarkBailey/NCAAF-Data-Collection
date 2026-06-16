import { ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppStore } from '@/store/gameStore'
import type { GameState } from '@/types'

interface FieldDirectionDialogProps {
  fixtureId: string
  game: GameState
  variant?: 'custom' | 'shadcn'
}

export function FieldDirectionDialog({
  fixtureId,
  game,
  variant = 'custom',
}: FieldDirectionDialogProps) {
  const setHomeAttacksRight = useAppStore((s) => s.setHomeAttacksRight)
  const open = game.homeAttacksRight === null
  const { homeTeam, homeAbbr } = game.fixture

  const buttonClass = cn(
    'inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition-colors active:bg-[var(--color-play-card-bg)]',
    variant === 'shadcn' &&
      'border-border bg-background text-foreground hover:bg-muted',
  )

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'border-[var(--color-panel-border)] bg-[var(--color-panel)] sm:max-w-sm',
          variant === 'shadcn' && 'border-border bg-popover',
        )}
      >
        <DialogHeader>
          <DialogTitle
            className={cn(
              'text-base font-semibold text-[var(--color-text)]',
              variant === 'shadcn' && 'text-foreground',
            )}
          >
            Set {homeTeam} field direction
          </DialogTitle>
          <DialogDescription
            className={cn(
              'text-sm leading-relaxed text-[var(--color-text-muted)]',
              variant === 'shadcn' && 'text-muted-foreground',
            )}
          >
            Which direction is {homeAbbr} attacking? This controls the ball-on
            arrow for the rest of the game.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter
          className={cn(
            'border-[var(--color-panel-border)] bg-[var(--color-play-card-bg)] sm:grid sm:grid-cols-2 sm:gap-2',
            variant === 'shadcn' && 'border-border bg-muted/50 sm:grid sm:grid-cols-2 sm:gap-2',
          )}
        >
          <button
            type="button"
            className={buttonClass}
            onClick={() => setHomeAttacksRight(fixtureId, false)}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Attacks left
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => setHomeAttacksRight(fixtureId, true)}
          >
            Attacks right
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
