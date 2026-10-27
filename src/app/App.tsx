
import '../styles/app.css'
import Header from '../components/layout/Header'
import { Route, Routes } from 'react-router'
import GamesPage from '../features/games/pages/GamesPage'

import HomePage from '../features/dashboard/pages/HomePage'
import PlayersPage from '../features/players/pages/PlayersPage'
import StandingsPage from '../features/standings/pages/StandingsPage'
import TeamStatsPage from '../features/team-stats/pages/TeamStatsPage'
import { CompetitionProvider } from '../lib/CompetitionProvider'



function App() {
//const [count, setCount] = useState(0)

  return (
    <CompetitionProvider>
      <div className="app-shell">
        <Header />
        <main className="app-main">
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/partidos" element={<GamesPage />} />
          <Route path="/plantilla" element={<PlayersPage />} />
          <Route path="/clasificacion" element={<StandingsPage />} />
          <Route path="/estadisticas" element={<TeamStatsPage />} />
        </Routes>
        </main>
        
      </div>
    </CompetitionProvider>
  )
}

export default App

