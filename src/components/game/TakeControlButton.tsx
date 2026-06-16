import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TakeControlButtonProps {
  takeControlActive: boolean
  onToggleTakeControl: () => void
  variant?: 'custom' | 'shadcn'
}

export function TakeControlButton({
  takeControlActive,
  onToggleTakeControl,
  variant = 'custom',
}: TakeControlButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleClick = () => {
    if (takeControlActive) {
      onToggleTakeControl()
      return
    }
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    onToggleTakeControl()
    setConfirmOpen(false)
  }

  const label = takeControlActive ? 'Stop Control' : 'Take Control'

  return (
    <>
      {variant === 'custom' ? (
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            'min-w-[8.25rem] rounded-[10px] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors landscape-mobile:px-3 landscape-mobile:py-2 landscape-mobile:text-xs',
            takeControlActive
              ? 'bg-[var(--color-danger)] hover:bg-[var(--color-danger-hover)]'
              : 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)]',
          )}
        >
          {label}
        </button>
      ) : (
        <Button
          variant="ghost"
          className={cn(
            'min-w-[8.25rem] border-0 text-white shadow-none',
            takeControlActive
              ? 'bg-[var(--color-danger)] hover:bg-[var(--color-danger-hover)]'
              : 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)]',
          )}
          onClick={handleClick}
        >
          {label}
        </Button>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
              Take control of this game?
            </DialogTitle>
            <DialogDescription
              className={cn(
                'text-sm leading-relaxed text-[var(--color-text-muted)]',
                variant === 'shadcn' && 'text-muted-foreground',
              )}
            >
              Automatic play simulation will pause and you will assume manual
              control of this fixture. The game panel will be highlighted until
              you stop control.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter
            className={cn(
              'border-[var(--color-panel-border)] bg-[var(--color-play-card-bg)]',
              variant === 'shadcn' && 'border-border bg-muted/50',
            )}
          >
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className={cn(
                'rounded-[8px] border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition-colors active:bg-[var(--color-play-card-bg)]',
                variant === 'shadcn' &&
                  'border-border bg-background text-foreground hover:bg-muted',
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={cn(
                'rounded-[8px] bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]',
                variant === 'shadcn' &&
                  'bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)]',
              )}
            >
              Take Control
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
