import { useEffect } from 'react'
import { useAppStore } from '@/store/gameStore'

/** Keeps a single interval per fixture; reads latest running state from the store. */
export function useClockTicker(fixtureId: string | undefined) {
  useEffect(() => {
    if (!fixtureId) return

    const id = window.setInterval(() => {
      const game = useAppStore.getState().games[fixtureId]
      if (game?.clock.running && game.clock.seconds > 0) {
        useAppStore.getState().tickClock(fixtureId)
      }
    }, 1000)

    return () => window.clearInterval(id)
  }, [fixtureId])
}
