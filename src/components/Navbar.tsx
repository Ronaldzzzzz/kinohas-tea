import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { subscribeGlobalSettings } from '../lib/firestore'

export default function Navbar() {
  const [businessOpen, setBusinessOpen] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    // 即時訂閱：Navbar 掛在 App 根層不隨路由重掛載，一次性讀取會讀到後台儲存前的舊值
    return subscribeGlobalSettings(s => setBusinessOpen(s.businessOpen ?? true))
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 首頁頂部：透明疊在深綠 Hero 上；捲動後(或其他頁)轉白底
  const overHero = pathname === '/' && !scrolled

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-2 sm:px-4 py-1 text-sm tracking-wide transition-colors ${
      overHero
        ? isActive
          ? 'text-[var(--color-on-deep)] font-semibold'
          : 'text-[var(--color-on-deep)] opacity-75 hover:opacity-100'
        : isActive
          ? 'text-[var(--color-gold-primary)] font-semibold'
          : 'text-[var(--color-text-primary)] hover:text-[var(--color-gold-primary)]'
    }`

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
        overHero
          ? 'bg-transparent border-b border-transparent'
          : 'bg-white/95 backdrop-blur border-b border-[var(--color-border-primary)] shadow-sm'
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link to="/" className="flex flex-col justify-center">
          <span
            className={`font-serif font-bold text-base sm:text-lg md:text-xl tracking-widest whitespace-nowrap transition-colors ${
              overHero ? 'text-[var(--color-on-deep)]' : 'text-[var(--color-gold-primary)]'
            }`}
          >
            木葉茗茶坊{' '}
            <span
              className={`hidden sm:inline text-[11px] font-sans font-normal tracking-[0.2em] align-middle transition-colors ${
                overHero ? 'text-[var(--color-on-deep)] opacity-60' : 'text-[var(--color-text-muted)]'
              }`}
            >
              KINOHA'S TEA
            </span>
          </span>
          <span
            className={`inline-flex items-center gap-1.5 self-start mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide leading-tight border ${
              businessOpen
                ? 'text-green-500 border-green-500/40 bg-green-500/10'
                : 'text-red-500 border-red-500/40 bg-red-500/10'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${businessOpen ? 'bg-green-500' : 'bg-red-500'} ${businessOpen ? 'animate-pulse' : ''}`} />
            {businessOpen ? '營業中' : '休息中'}
          </span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          <NavLink to="/" className={linkClass} end>
            首頁
          </NavLink>
          <NavLink to="/story" className={linkClass}>
            本店歷史
          </NavLink>
          <NavLink to="/directions" className={linkClass}>
            交通指引
          </NavLink>
          <NavLink to="/guestbook" className={linkClass}>
            留言板
          </NavLink>
          <NavLink to="/admin" aria-label="後台管理" className={({ isActive }) =>
            `ml-1 sm:ml-2 p-2 text-lg sm:text-xl leading-none transition-colors ${
              overHero
                ? 'text-[var(--color-on-deep)] opacity-60 hover:opacity-100'
                : `text-[var(--color-text-muted)] hover:text-[var(--color-gold-light)] ${isActive ? 'text-[var(--color-gold-light)]' : ''}`
            }`
          }>
            ⚙
          </NavLink>
        </div>
      </div>
    </nav>
  )
}
