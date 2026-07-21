import { useEffect, useState } from 'react'
import { incrementHitCounter, subscribeHitCounter, formatCounter } from '../lib/siteStats'

const DEDUP_KEY = 'hitCounterLastCountedAt'
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000

/** 復古 LCD 樣式訪客計數器：即時顯示全站總訪問數，同一瀏覽器 24 小時內只計一次 */
export default function HitCounter() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeHitCounter(setCount)

    const lastCountedAt = Number(localStorage.getItem(DEDUP_KEY) ?? 0)
    if (Date.now() - lastCountedAt >= DEDUP_WINDOW_MS) {
      localStorage.setItem(DEDUP_KEY, String(Date.now()))
      incrementHitCounter().catch(() => localStorage.removeItem(DEDUP_KEY))
    }

    return unsubscribe
  }, [])

  if (count === null) return null

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <span className="text-[10px] text-[var(--color-on-deep)] opacity-60 tracking-wider">本網頁已有</span>
      <span className="font-mono text-sm bg-black text-[#39ff14] px-2 py-0.5 rounded tracking-[0.2em] border border-[#39ff14]/40">
        {formatCounter(count)}
      </span>
      <span className="text-[10px] text-[var(--color-on-deep)] opacity-60 tracking-wider">位訪客</span>
    </div>
  )
}
