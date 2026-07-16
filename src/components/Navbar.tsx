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
    `px-2 sm:px-3 py-1 text-xs sm:text-sm transition-colors ${
      isActive
        ? 'text-[var(--color-gold-light)] border-b border-[var(--color-gold-primary)]'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
    }`

  return (
    <nav className="border-b border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]">
      <div className="max-w-4xl mx-auto px-4 h-12 sm:h-14 flex items-center justify-between">
        <div className="flex flex-col justify-center">
          <span className="font-serif text-[var(--color-gold-primary)] text-sm sm:text-base md:text-xl tracking-wide sm:tracking-widest flex items-center gap-1 whitespace-nowrap">
            木葉茗茶坊
          </span>
          {address && (
            <span className="hidden sm:block text-[11px] text-[var(--color-text-muted)] tracking-wide leading-tight mt-0.5">
              📍 {address}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          <NavLink to="/" className={linkClass} end>
            菜單
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
