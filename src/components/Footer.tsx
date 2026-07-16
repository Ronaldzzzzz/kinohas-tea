import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getGlobalSettings } from '../lib/firestore'

export default function Footer() {
  const [address, setAddress] = useState<string>('')

  useEffect(() => {
    getGlobalSettings()
      .then(s => setAddress(s.address ?? ''))
      .catch(() => {/* 靜默失敗，不顯示地址 */})
  }, [])

  return (
    <footer className="mt-12 bg-[var(--color-deep-green)] text-[var(--color-on-deep)]">
      <div className="max-w-4xl mx-auto px-4 py-10 sm:py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
        <div>
          <h4 className="font-serif text-base tracking-[0.25em] mb-3">木葉茗茶坊</h4>
          <p className="opacity-70 leading-relaxed text-xs tracking-wider">
            KINOHA'S TEA<br />
            台式茶莊 · FF14 RP
          </p>
        </div>
        <div>
          <h4 className="font-serif text-base tracking-[0.25em] mb-3">快速連結</h4>
          <ul className="flex flex-col gap-1.5 opacity-80">
            <li><Link to="/" className="hover:opacity-100 hover:underline underline-offset-4">首頁</Link></li>
            <li><Link to="/guestbook" className="hover:opacity-100 hover:underline underline-offset-4">留言板</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-serif text-base tracking-[0.25em] mb-3">店舖資訊</h4>
          <p className="opacity-70 leading-relaxed text-xs">
            {address ? <>📍 {address}</> : '營業資訊請見告示看板'}
          </p>
        </div>
      </div>
      <div className="border-t border-[var(--color-on-deep)]/10">
        <p className="max-w-4xl mx-auto px-4 py-4 text-center text-[11px] opacity-50 tracking-wider">
          © 木葉茗茶坊 Kinoha's Tea — Final Fantasy XIV Roleplay
        </p>
      </div>
    </footer>
  )
}
