
import '../styles/app.css'
import { useLayoutEffect } from 'react'
import Header from '../components/layout/Header'
import { Route, Routes, useLocation } from 'react-router'
import GamesPage from '../features/games/pages/GamesPage'

import HomePage from '../features/dashboard/pages/HomePage'
import PlayersPage from '../features/players/pages/PlayersPage'
import StandingsPage from '../features/standings/pages/StandingsPage'
import TeamStatsPage from '../features/team-stats/pages/TeamStatsPage'
import { CompetitionProvider } from '../lib/CompetitionProvider'
import ManagementPage from '../features/management/pages/ManagementPage'

function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    const previousScrollBehavior = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'auto'
    window.scrollTo(0, 0)
    document.documentElement.style.scrollBehavior = previousScrollBehavior
  }, [pathname])

  return null
}



function App() {
//const [count, setCount] = useState(0)

  return (
    <CompetitionProvider>
      <div className="app-shell">
        <ScrollToTop />
        <Header />
        <main className="app-main">
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/partidos" element={<GamesPage />} />
          <Route path="/plantilla" element={<PlayersPage />} />
          <Route path="/clasificacion" element={<StandingsPage />} />
          <Route path="/estadisticas" element={<TeamStatsPage />} />
          <Route path="/gestion" element={<ManagementPage />} />
        </Routes>
        </main>
        
      </div>
    </CompetitionProvider>
  )
}

export default App

