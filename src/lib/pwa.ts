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

export function markIosNotchDevice(): void {
  document.documentElement.classList.toggle('ios-notch', detectIosWithNotch())
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

  window.addEventListener('resize', markIosNotchDevice)
  window.addEventListener('orientationchange', markIosNotchDevice)

  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Installability falls back to manifest-only where supported.
    })
  })
}
