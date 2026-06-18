import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initPwa } from '@/lib/pwa'
import App from './App'

initPwa()

document.documentElement.dataset.uiVariant = 'shadcn'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
