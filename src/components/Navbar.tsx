import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getGlobalSettings } from '../lib/firestore'

export default function Navbar() {
  const [address, setAddress] = useState<string>('')

  useEffect(() => {
    getGlobalSettings()
      .then(s => setAddress(s.address ?? ''))
      .catch(() => {/* 靜默失敗，不顯示地址 */})
  }, [])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-2 sm:px-4 py-1 text-sm tracking-wide transition-colors ${
      isActive
        ? 'text-[var(--color-gold-primary)] font-semibold'
        : 'text-[var(--color-text-primary)] hover:text-[var(--color-gold-primary)]'
    }`

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--color-border-primary)] bg-white/95 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex flex-col justify-center">
          <span className="font-serif font-bold text-[var(--color-gold-primary)] text-base sm:text-lg md:text-xl tracking-widest whitespace-nowrap">
            木葉茗茶坊 <span className="hidden sm:inline text-[11px] font-sans font-normal text-[var(--color-text-muted)] tracking-[0.2em] align-middle">KINNOHA'S TEA</span>
          </span>
          {address && (
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
          <NavLink to="/admin" className={({ isActive }) =>
            `ml-2 sm:ml-3 text-[var(--color-text-muted)] hover:text-[var(--color-gold-light)] transition-colors text-xs ${isActive ? 'text-[var(--color-gold-light)]' : ''}`
          }>
            ⚙
          </NavLink>
        </div>
      </div>
    </nav>
  )
}
