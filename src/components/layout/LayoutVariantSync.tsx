import { useEffect } from 'react'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'

/** Syncs the display-resilience layout variant onto <html> for CSS scoping. */
export function LayoutVariantSync() {
  const displayResilience = useFeatureFlag('layout.displayResilience')

  useEffect(() => {
    document.documentElement.dataset.layoutVariant = displayResilience
      ? 'resilient'
      : 'original'
  }, [displayResilience])

  return null
}

export function useDisplayResilience(): boolean {
  return useFeatureFlag('layout.displayResilience')
}
