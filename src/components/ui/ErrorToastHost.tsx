import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useErrorToastStore } from '@/store/errorToastStore'

const EXIT_ANIMATION_MS = 280
const SWIPE_DISMISS_THRESHOLD_PX = 48

type ExitDirection = 'up' | 'right'

export function ErrorToastHost() {
  const visible = useErrorToastStore((s) => s.visible)
  const exiting = useErrorToastStore((s) => s.exiting)
  const message = useErrorToastStore((s) => s.message)
  const dismiss = useErrorToastStore((s) => s.dismiss)
  const finishExit = useErrorToastStore((s) => s.finishExit)

  const [dragOffsetX, setDragOffsetX] = useState(0)
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [exitDirection, setExitDirection] = useState<ExitDirection>('up')
  const pointerStartXRef = useRef(0)
  const pointerStartYRef = useRef(0)
  const dragOffsetXRef = useRef(0)
  const dragOffsetYRef = useRef(0)

  const resetDrag = () => {
    dragOffsetXRef.current = 0
    dragOffsetYRef.current = 0
    setDragOffsetX(0)
    setDragOffsetY(0)
    setIsDragging(false)
  }

  useEffect(() => {
    if (!exiting) return

    const timer = window.setTimeout(() => {
      finishExit()
      resetDrag()
      setExitDirection('up')
    }, EXIT_ANIMATION_MS)

    return () => window.clearTimeout(timer)
  }, [exiting, finishExit])

  useEffect(() => {
    if (!visible) {
      resetDrag()
      setExitDirection('up')
    }
  }, [visible])

  if (!visible) return null

  const handleDismiss = (direction: ExitDirection = 'up') => {
    if (exiting) return
    setExitDirection(direction)
    resetDrag()
    dismiss()
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (exiting) return

    event.currentTarget.setPointerCapture(event.pointerId)
    pointerStartXRef.current = event.clientX
    pointerStartYRef.current = event.clientY
    setIsDragging(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || exiting) return

    const deltaX = event.clientX - pointerStartXRef.current
    const deltaY = event.clientY - pointerStartYRef.current
    const nextOffsetX = Math.max(0, deltaX)
    const nextOffsetY = Math.min(0, deltaY)

    dragOffsetXRef.current = nextOffsetX
    dragOffsetYRef.current = nextOffsetY
    setDragOffsetX(nextOffsetX)
    setDragOffsetY(nextOffsetY)
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return

    event.currentTarget.releasePointerCapture(event.pointerId)
    setIsDragging(false)

    if (dragOffsetYRef.current <= -SWIPE_DISMISS_THRESHOLD_PX) {
      handleDismiss('up')
      return
    }

    if (dragOffsetXRef.current >= SWIPE_DISMISS_THRESHOLD_PX) {
      handleDismiss('right')
      return
    }

    resetDrag()
  }

  const dragFadeProgress = Math.max(
    dragOffsetY < 0
      ? Math.abs(dragOffsetY) / SWIPE_DISMISS_THRESHOLD_PX
      : 0,
    dragOffsetX / SWIPE_DISMISS_THRESHOLD_PX,
  )

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex justify-end p-3 safe-t safe-r"
      aria-live="assertive"
    >
      <div
        role="alert"
        className={cn(
          'pointer-events-auto flex w-[min(18rem,calc(100vw-1.5rem))] items-start gap-2 rounded-lg border border-destructive/30 bg-destructive px-2.5 py-2 text-xs shadow-lg touch-none select-none',
          exiting
            ? exitDirection === 'right'
              ? 'error-toast-exit-right'
              : 'error-toast-exit'
            : 'error-toast-enter',
          isDragging && 'transition-none',
        )}
        style={{
          transform:
            dragOffsetX || dragOffsetY
              ? `translate3d(${dragOffsetX}px, ${dragOffsetY}px, 0)`
              : undefined,
          opacity:
            dragFadeProgress > 0
              ? Math.max(0.35, 1 - dragFadeProgress * 0.65)
              : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <TriangleAlert
          className="mt-px size-3.5 shrink-0 text-white"
          aria-hidden
        />
        <p className="min-w-0 flex-1 text-xs leading-snug text-white">
          {message}
        </p>
        <button
          type="button"
          className="mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Dismiss error"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            handleDismiss('up')
          }}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>,
    document.body,
  )
}
