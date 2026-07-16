import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import MenuPage from './pages/MenuPage'
import GuestbookPage from './pages/GuestbookPage'
import AdminPage from './pages/AdminPage'
import PopupLayer from './components/popups/PopupLayer'

export default function App() {
  return (
    <HashRouter>
      {/* overflow-x-clip：裁掉滿版區塊的水平溢出，且不像 overflow-hidden 會破壞 fixed/sticky 定位 */}
      <div className="min-h-screen relative overflow-x-clip flex flex-col">
        {/* 最底層：背景色 */}
        <div className="fixed inset-0 bg-[var(--color-bg-primary)] z-[-2]" />

        {/* 最上層：導覽與內容 */}
        <Navbar />
        <main className="relative z-10 max-w-4xl mx-auto px-4 pt-20 sm:pt-24 pb-6 w-full flex-1">
          <Routes>
            <Route path="/" element={<MenuPage />} />
            <Route path="/guestbook" element={<GuestbookPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
        <PopupLayer />
      </div>
    </HashRouter>
  )
}
