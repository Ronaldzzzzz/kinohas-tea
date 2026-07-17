import { useEffect, useState } from 'react'
import { incrementHitCounter, formatCounter } from '../lib/siteStats'

const SESSION_KEY = 'hitCounterCounted'

/** 復古 LCD 樣式訪客計數器：同一分頁 session 只計一次，關閉分頁重開才會再次遞增 */
export default function HitCounter() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const alreadyCounted = sessionStorage.getItem(SESSION_KEY)
    if (alreadyCounted) {
      if (alreadyCounted !== 'pending') setCount(Number(alreadyCounted))
      return
    }
    sessionStorage.setItem(SESSION_KEY, 'pending')
    incrementHitCounter()
      .then(next => {
        sessionStorage.setItem(SESSION_KEY, String(next))
        setCount(next)
      })
      .catch(() => {
        sessionStorage.removeItem(SESSION_KEY)
      })
  }, [])

  if (count === null) return null

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <span className="text-[10px] text-[var(--color-on-deep)] opacity-60 tracking-wider">您是本站第</span>
      <span className="font-mono text-sm bg-black text-[#39ff14] px-2 py-0.5 rounded tracking-[0.2em] border border-[#39ff14]/40">
        {formatCounter(count)}
      </span>
      <span className="text-[10px] text-[var(--color-on-deep)] opacity-60 tracking-wider">位訪客</span>
    </div>
  )
}
