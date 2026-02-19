import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './Navbar'
import { MegaFooter } from './MegaFooter'
import AnimeGuesser from './AnimeGuesser'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { SupportUsPage } from './pages/SupportUsPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<AnimeGuesser />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/support" element={<SupportUsPage />} />
          </Routes>
        </main>
        <MegaFooter />
      </div>
    </BrowserRouter>
  )
}
