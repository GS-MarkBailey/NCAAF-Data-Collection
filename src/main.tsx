import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const storedVariant = localStorage.getItem('ncaaf-ui-variant')
if (storedVariant) {
  try {
    const parsed = JSON.parse(storedVariant) as { state?: { variant?: string } }
    if (parsed.state?.variant === 'shadcn' || parsed.state?.variant === 'custom') {
      document.documentElement.dataset.uiVariant = parsed.state.variant
    }
  } catch {
    // ignore malformed storage
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
