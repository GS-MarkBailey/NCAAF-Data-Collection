import { useEffect, useRef, useState } from 'react'

export const PUSH_PULSE_MS = 1000

/** Pulses when `value` changes (e.g. live push updates to scoreboard stats). */
export function usePushPulse<T>(value: T, skipInitial = true): boolean {
  const [pulsing, setPulsing] = useState(false)
  const prev = useRef(value)
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      if (skipInitial) {
        prev.current = value
        return
      }
    }

    if (Object.is(prev.current, value)) return

    prev.current = value
    setPulsing(true)
    const id = window.setTimeout(() => setPulsing(false), PUSH_PULSE_MS)
    return () => window.clearTimeout(id)
  }, [value, skipInitial])

  return pulsing
}

/** Pulses once when a new keyed item appears (e.g. newest play-by-play entry). */
export function useEnterPulse(active: boolean, key: string): boolean {
  const [pulsing, setPulsing] = useState(false)
  const seenKey = useRef<string | null>(null)

  useEffect(() => {
    if (!active || seenKey.current === key) return

    seenKey.current = key
    setPulsing(true)
    const id = window.setTimeout(() => setPulsing(false), PUSH_PULSE_MS)
    return () => window.clearTimeout(id)
  }, [active, key])

  return pulsing
}
