import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './Navbar'
import { MegaFooter } from './MegaFooter'
import AnimeGuesser from './AnimeGuesser'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { SupportUsPage } from './pages/SupportUsPage'

export default function App() {
  const [gameActive, setGameActive] = useState(false)

  return (
    <BrowserRouter>
      <div className="app-root">
        {!gameActive && <Navbar />}
        <main className="app-main" style={gameActive ? { paddingTop: 0 } : undefined}>
          <Routes>
            <Route path="/" element={<AnimeGuesser onScreenChange={(s, loading) => setGameActive(s === 'playing' || s === 'results' || loading)} />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/support" element={<SupportUsPage />} />
          </Routes>
        </main>
        {!gameActive && <MegaFooter />}
      </div>
    </BrowserRouter>
  )
}
