import { useCallback, useEffect, useRef, useState } from 'react'

const PULL_THRESHOLD_PX = 56
const MAX_PULL_PX = 88
const REFRESH_MIN_MS = 500

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>
  disabled?: boolean
}

export function usePullToRefresh({
  onRefresh,
  disabled = false,
}: UsePullToRefreshOptions) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const pullingRef = useRef(false)
  const pullDistanceRef = useRef(0)
  const refreshingRef = useRef(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const updatePullDistance = (distance: number) => {
    pullDistanceRef.current = distance
    setPullDistance(distance)
  }

  const runRefresh = useCallback(async () => {
    refreshingRef.current = true
    setRefreshing(true)
    const startedAt = Date.now()

    try {
      await onRefresh()
    } finally {
      const elapsed = Date.now() - startedAt
      if (elapsed < REFRESH_MIN_MS) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, REFRESH_MIN_MS - elapsed),
        )
      }

      refreshingRef.current = false
      setRefreshing(false)
      pullingRef.current = false
      updatePullDistance(0)
    }
  }, [onRefresh])

  useEffect(() => {
    const element = scrollRef.current
    if (!element || disabled) return

    const handleTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || element.scrollTop > 0) return

      startYRef.current = event.touches[0]?.clientY ?? 0
      pullingRef.current = true
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || refreshingRef.current) return
      if (element.scrollTop > 0) {
        pullingRef.current = false
        updatePullDistance(0)
        return
      }

      const currentY = event.touches[0]?.clientY ?? startYRef.current
      const deltaY = currentY - startYRef.current

      if (deltaY <= 0) {
        updatePullDistance(0)
        return
      }

      event.preventDefault()
      updatePullDistance(Math.min(deltaY * 0.45, MAX_PULL_PX))
    }

    const handleTouchEnd = () => {
      if (!pullingRef.current || refreshingRef.current) return

      if (pullDistanceRef.current >= PULL_THRESHOLD_PX) {
        void runRefresh()
        return
      }

      pullingRef.current = false
      updatePullDistance(0)
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)
    element.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [disabled, runRefresh])

  return {
    scrollRef,
    pullDistance,
    refreshing,
    pullReady: pullDistance >= PULL_THRESHOLD_PX,
  }
}
