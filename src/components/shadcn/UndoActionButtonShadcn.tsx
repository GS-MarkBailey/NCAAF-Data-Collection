import { Undo2 } from 'lucide-react'
import { canUndoPlayAction } from '@/lib/football'
import { useAppStore } from '@/store/gameStore'
import { Button } from '@/components/ui/button'

interface UndoActionButtonShadcnProps {
  fixtureId: string
}

export function UndoActionButtonShadcn({
  fixtureId,
}: UndoActionButtonShadcnProps) {
  const game = useAppStore((s) => s.games[fixtureId])
  const undoPlayControl = useAppStore((s) => s.undoPlayControl)
  const canUndo = canUndoPlayAction(game)

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={!canUndo}
      title="Undo last action"
      aria-label="Undo last action"
      onClick={() => undoPlayControl(fixtureId)}
    >
      <Undo2 />
      <span className="sr-only">Undo</span>
    </Button>
  )
}
