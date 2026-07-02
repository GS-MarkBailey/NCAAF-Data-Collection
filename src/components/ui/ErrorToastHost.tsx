import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { showErrorToast, useErrorToastStore } from '@/store/errorToastStore'

const EXIT_ANIMATION_MS = 280
const SWIPE_DISMISS_THRESHOLD_PX = 48
const ERROR_TOAST_INTERVAL_MS = 30_000

export function ErrorToastHost() {
  const visible = useErrorToastStore((s) => s.visible)
  const exiting = useErrorToastStore((s) => s.exiting)
  const message = useErrorToastStore((s) => s.message)
  const dismiss = useErrorToastStore((s) => s.dismiss)
  const finishExit = useErrorToastStore((s) => s.finishExit)

  const [dragOffsetY, setDragOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const pointerStartYRef = useRef(0)
  const dragOffsetYRef = useRef(0)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      showErrorToast()
    }, ERROR_TOAST_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!exiting) return

    const timer = window.setTimeout(() => {
      finishExit()
      setDragOffsetY(0)
      dragOffsetYRef.current = 0
    }, EXIT_ANIMATION_MS)

    return () => window.clearTimeout(timer)
  }, [exiting, finishExit])

  useEffect(() => {
    if (!visible) {
      setDragOffsetY(0)
      dragOffsetYRef.current = 0
      setIsDragging(false)
    }
  }, [visible])

  if (!visible) return null

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (exiting) return

    event.currentTarget.setPointerCapture(event.pointerId)
    pointerStartYRef.current = event.clientY
    setIsDragging(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || exiting) return

    const deltaY = event.clientY - pointerStartYRef.current
    const nextOffset = Math.min(0, deltaY)
    dragOffsetYRef.current = nextOffset
    setDragOffsetY(nextOffset)
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return

    event.currentTarget.releasePointerCapture(event.pointerId)
    setIsDragging(false)

    if (dragOffsetYRef.current <= -SWIPE_DISMISS_THRESHOLD_PX) {
      dismiss()
      return
    }

    dragOffsetYRef.current = 0
    setDragOffsetY(0)
  }

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex justify-end p-3 safe-t safe-r"
      aria-live="assertive"
    >
      <div
        role="alert"
        className={cn(
          'pointer-events-auto flex w-[min(18rem,calc(100vw-1.5rem))] items-start gap-2 rounded-lg border border-destructive/30 bg-destructive px-2.5 py-2 text-xs shadow-lg touch-none select-none',
          exiting ? 'error-toast-exit' : 'error-toast-enter',
          isDragging && 'transition-none',
        )}
        style={{
          transform: dragOffsetY
            ? `translate3d(0, ${dragOffsetY}px, 0)`
            : undefined,
          opacity:
            dragOffsetY < 0
              ? Math.max(0.35, 1 + dragOffsetY / SWIPE_DISMISS_THRESHOLD_PX)
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
      </div>
    </div>,
    document.body,
  )
}
