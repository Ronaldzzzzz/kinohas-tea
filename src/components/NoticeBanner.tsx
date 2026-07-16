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
  const displayContent = activeNotice.lines.join(' | ')
  const displayEmoji = activeNotice.emoji || '📢'

  return (
    <div className="mb-4 sm:mb-6 p-2 sm:p-3 rounded border border-[var(--color-gold-primary)]/30 bg-[var(--color-bg-card)] shadow-[var(--shadow-glow-warm)] flex items-center gap-2 sm:gap-3">
      <span className="text-lg sm:text-xl animate-pulse flex-shrink-0">{displayEmoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[var(--color-gold-primary)] text-xs sm:text-sm font-medium tracking-wide leading-relaxed">
          {displayContent}
        </p>
      </div>
    </div>
  )
}
