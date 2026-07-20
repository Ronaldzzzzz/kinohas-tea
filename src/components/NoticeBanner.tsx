import { useEffect, useState } from 'react'
import { getNotices } from '../lib/firestore'
import type { NoticeConfig } from '../types'

export default function NoticeBanner() {
  const [notices, setNotices] = useState<NoticeConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNotices()
      .then(data => {
        setNotices(data.filter(n => n.isActive !== false))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading || notices.length === 0) return null

  const activeNotice = notices[0]
  const displayEmoji = activeNotice.emoji || '📢'

  return (
    <div className="mb-4 sm:mb-6 p-2 sm:p-3 rounded border border-[var(--color-gold-primary)]/30 bg-[var(--color-bg-card)] shadow-[var(--shadow-glow-warm)] flex flex-col items-start gap-1">
      <span className="text-lg sm:text-xl animate-pulse">{displayEmoji}</span>
      <div className="w-full min-w-0 flex flex-col gap-0.5 pl-2">
        {activeNotice.lines.map((line, idx) => (
          <p key={idx} className="text-[var(--color-gold-primary)] text-xs sm:text-sm font-medium tracking-wide leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
