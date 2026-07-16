import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import MenuPage from './pages/MenuPage'
import GuestbookPage from './pages/GuestbookPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen relative overflow-x-hidden">
        {/* 最底層：背景色 */}
        <div className="fixed inset-0 bg-[var(--color-bg-primary)] z-[-2]" />

        {/* 最上層：導覽與內容 */}
        <Navbar />
        <main className="relative z-10 max-w-4xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<MenuPage />} />
            <Route path="/guestbook" element={<GuestbookPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
