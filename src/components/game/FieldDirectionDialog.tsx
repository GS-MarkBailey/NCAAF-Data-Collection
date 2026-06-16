import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppStore } from '@/store/gameStore'
import type { GameState } from '@/types'

interface FieldDirectionDialogProps {
  fixtureId: string
  game: GameState
}

export function FieldDirectionDialog({ fixtureId, game }: FieldDirectionDialogProps) {
  const setHomeAttacksRight = useAppStore((s) => s.setHomeAttacksRight)
  const open = game.homeAttacksRight === null
  const { homeTeam, homeAbbr } = game.fixture

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set field direction</DialogTitle>
          <DialogDescription>
            Which direction is {homeTeam} ({homeAbbr}) attacking? This controls
            the ball-on arrow for the rest of the game.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => setHomeAttacksRight(fixtureId, false)}
          >
            <ArrowLeft className="size-6" aria-hidden />
            <span className="text-sm font-medium">Attacks left</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => setHomeAttacksRight(fixtureId, true)}
          >
            <ArrowRight className="size-6" aria-hidden />
            <span className="text-sm font-medium">Attacks right</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
