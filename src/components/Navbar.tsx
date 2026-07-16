import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { getGlobalSettings } from '../lib/firestore'

export default function Navbar() {
  const [address, setAddress] = useState<string>('')
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    getGlobalSettings()
      .then(s => setAddress(s.address ?? ''))
      .catch(() => {/* 靜默失敗，不顯示地址 */})
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
        <div className="flex flex-col justify-center">
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
          {address && !overHero && (
            <span className="hidden md:block text-[11px] text-[var(--color-text-muted)] tracking-wide leading-tight">
              📍 {address}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          <NavLink to="/" className={linkClass} end>
            首頁
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
