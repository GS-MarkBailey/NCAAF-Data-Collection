function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function markStandaloneMode(): void {
  const standalone = isStandaloneDisplay()
  document.documentElement.classList.toggle('standalone-app', standalone)
  document.documentElement.dataset.displayMode = standalone ? 'standalone' : 'browser'
}

export function initPwa(): void {
  markStandaloneMode()

  const displayModes = [
    '(display-mode: standalone)',
    '(display-mode: fullscreen)',
    '(display-mode: minimal-ui)',
  ] as const

  for (const query of displayModes) {
    window.matchMedia(query).addEventListener('change', markStandaloneMode)
  }

  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Installability falls back to manifest-only where supported.
    })
  })
}
