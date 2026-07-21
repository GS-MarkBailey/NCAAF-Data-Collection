import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initPwa } from '@/lib/pwa'
import { initFeatureFlags } from '@/store/featureFlagStore'
import App from './App'

initPwa()
document.documentElement.dataset.uiVariant = 'shadcn'
document.documentElement.dataset.layoutVariant = 'original'

const rootElement = document.getElementById('root')

if (rootElement) {
  const root = createRoot(rootElement)

  root.render(
    <StrictMode>
      <p className="flex h-dvh items-center justify-center text-sm text-muted-foreground">
        Loading…
      </p>
    </StrictMode>,
  )

  void initFeatureFlags()
    .catch(() => {
      // Still mount the app if flag fetch fails (offline / cache issues).
    })
    .finally(() => {
      root.render(
        <StrictMode>
          <App />
        </StrictMode>,
      )
    })
}
