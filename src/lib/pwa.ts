function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function measureSafeAreaInset(side: 'left' | 'right' | 'top' | 'bottom'): number {
  const probe = document.createElement('div')
  probe.style.cssText = `position:fixed;visibility:hidden;padding-${side}:env(safe-area-inset-${side});`
  document.documentElement.appendChild(probe)
  const style = getComputedStyle(probe)
  const value = parseFloat(
    side === 'left'
      ? style.paddingLeft
      : side === 'right'
        ? style.paddingRight
        : side === 'top'
          ? style.paddingTop
          : style.paddingBottom,
  )
  probe.remove()
  return Number.isFinite(value) ? value : 0
}

/** iPhone with a display cutout (notch / Dynamic Island). */
export function detectIosWithNotch(): boolean {
  if (!/iPhone/i.test(navigator.userAgent)) return false

  if (measureSafeAreaInset('left') > 20) return true

  return Math.max(window.screen.width, window.screen.height) >= 812
}

const BASE_HORIZONTAL_SAFE = '1rem'

function inferNotchSideFromScreen(): 'left' | 'right' | null {
  const angle = screen.orientation?.angle ?? (window as Window & { orientation?: number }).orientation
  if (angle == null) return null
  if (angle === 90) return 'left'
  if (angle === 270 || angle === -90) return 'right'
  return null
}

function applyLandscapeSafePadding(hasNotch: boolean): void {
  const root = document.documentElement
  const isLandscape = window.matchMedia('(orientation: landscape)').matches

  if (!hasNotch || !isLandscape) {
    root.style.removeProperty('--app-safe-left')
    root.style.removeProperty('--app-safe-right')
    return
  }

  const leftInset = measureSafeAreaInset('left')
  const rightInset = measureSafeAreaInset('right')
  let notchOnLeft = leftInset > rightInset

  if (leftInset === rightInset) {
    const inferred = inferNotchSideFromScreen()
    if (inferred) notchOnLeft = inferred === 'left'
  }

  if (notchOnLeft) {
    root.style.setProperty('--app-safe-left', `max(${BASE_HORIZONTAL_SAFE}, ${leftInset}px)`)
    root.style.setProperty('--app-safe-right', BASE_HORIZONTAL_SAFE)
  } else {
    root.style.setProperty('--app-safe-left', BASE_HORIZONTAL_SAFE)
    root.style.setProperty('--app-safe-right', `max(${BASE_HORIZONTAL_SAFE}, ${rightInset}px)`)
  }
}

export function markIosNotchDevice(): void {
  const root = document.documentElement
  const hasNotch = detectIosWithNotch()
  root.classList.toggle('ios-notch', hasNotch)
  applyLandscapeSafePadding(hasNotch)
}

let safeAreaUpdateTimer: ReturnType<typeof setTimeout> | undefined

/** iOS updates safe-area insets after orientationchange; re-measure once layout settles. */
function scheduleSafeAreaUpdate(): void {
  markIosNotchDevice()

  if (safeAreaUpdateTimer) clearTimeout(safeAreaUpdateTimer)

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      markIosNotchDevice()
      safeAreaUpdateTimer = setTimeout(markIosNotchDevice, 150)
      setTimeout(markIosNotchDevice, 400)
    })
  })
}

export function markStandaloneMode(): void {
  const standalone = isStandaloneDisplay()
  document.documentElement.classList.toggle('standalone-app', standalone)
  document.documentElement.dataset.displayMode = standalone ? 'standalone' : 'browser'
}

export function initPwa(): void {
  markStandaloneMode()
  markIosNotchDevice()

  const displayModes = [
    '(display-mode: standalone)',
    '(display-mode: fullscreen)',
    '(display-mode: minimal-ui)',
  ] as const

  for (const query of displayModes) {
    window.matchMedia(query).addEventListener('change', markStandaloneMode)
  }

  window.addEventListener('resize', scheduleSafeAreaUpdate)
  window.addEventListener('orientationchange', scheduleSafeAreaUpdate)
  window.visualViewport?.addEventListener('resize', scheduleSafeAreaUpdate)
  screen.orientation?.addEventListener('change', scheduleSafeAreaUpdate)

  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Installability falls back to manifest-only where supported.
    })
  })
}
