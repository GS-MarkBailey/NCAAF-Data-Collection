import { useEffect, useRef, useState, type RefObject } from 'react'

export function groupPlaysByQuarter<T extends { quarter: number }>(
  plays: T[],
): { quarter: number; plays: T[] }[] {
  const map = new Map<number, T[]>()
  for (const play of plays) {
    const list = map.get(play.quarter) ?? []
    list.push(play)
    map.set(play.quarter, list)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([quarter, quarterPlays]) => ({
      quarter,
      plays: [...quarterPlays].reverse(),
    }))
}

export function useActiveQuarterOnScroll(
  quarters: number[],
  scrollRef: RefObject<HTMLElement | null>,
  stickyOffset = 36,
) {
  const [activeQuarter, setActiveQuarter] = useState(quarters[0] ?? 1)
  const [showHeaderDivider, setShowHeaderDivider] = useState(false)
  const sectionRefs = useRef(new Map<number, HTMLElement>())

  useEffect(() => {
    setActiveQuarter(quarters[0] ?? 1)
  }, [quarters])

  useEffect(() => {
    const container = scrollRef.current
    if (!container || quarters.length === 0) return

    const update = () => {
      const containerTop = container.getBoundingClientRect().top
      let current = quarters[0]

      for (const quarter of quarters) {
        const section = sectionRefs.current.get(quarter)
        if (!section) continue
        const sectionTop = section.getBoundingClientRect().top - containerTop
        if (sectionTop <= stickyOffset) current = quarter
      }

      setActiveQuarter(current)
      setShowHeaderDivider(container.scrollTop > 0)
    }

    update()
    container.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    return () => {
      container.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [quarters, scrollRef, stickyOffset])

  const setSectionRef =
    (quarter: number) => (element: HTMLElement | null) => {
      if (element) sectionRefs.current.set(quarter, element)
      else sectionRefs.current.delete(quarter)
    }

  return { activeQuarter, setSectionRef, showHeaderDivider }
}
