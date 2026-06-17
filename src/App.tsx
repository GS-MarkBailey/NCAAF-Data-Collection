import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { UiVariantSync } from '@/components/UiVariantSwitch'
import { FixturesPage } from '@/pages/FixturesPage'
import { GamePage } from '@/pages/GamePage'

export default function App() {
  return (
    <BrowserRouter>
      <UiVariantSync />
      <Routes>
        <Route path="/fixtures" element={<FixturesPage />} />
        <Route path="/game/:fixtureId" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/fixtures" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
