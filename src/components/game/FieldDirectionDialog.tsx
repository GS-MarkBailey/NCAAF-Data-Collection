import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldDirectionPicker } from '@/components/game/FieldDirectionPicker'
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
  const open = game.homeAttacksRight === null
  const { homeTeam, homeAbbr } = game.fixture

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
            Which direction is {homeAbbr} attacking?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter
          className={cn(
            'border-[var(--color-panel-border)] bg-[var(--color-play-card-bg)]',
            variant === 'shadcn' && 'border-border bg-muted/50',
          )}
        >
          <FieldDirectionPicker
            fixtureId={fixtureId}
            homeAbbr={homeAbbr}
            homeAttacksRight={game.homeAttacksRight}
            variant={variant}
            className="w-full"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
