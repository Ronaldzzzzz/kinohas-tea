import { useEffect, useState } from 'react'
import { getNotices, addNotice, updateNotice, getGlobalSettings, updateGlobalSettings } from '../../lib/firestore'
import type { NoticeConfig } from '../../types'
import { useToast } from '../../hooks/useToast'
import Toast from '../Toast'

interface Props {
  canWrite: boolean
}

export default function NoticeManager({ canWrite }: Props) {
  const [notice, setNotice] = useState<NoticeConfig | null>(null)
  const [emoji, setEmoji] = useState('📢')
  const [linesText, setLinesText] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [introText, setIntroText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast, showToast } = useToast()

  useEffect(() => {
    Promise.all([getNotices(), getGlobalSettings()]).then(([notices, settings]) => {
      if (notices.length > 0) {
        const active = notices[0]
        setNotice(active)
        setEmoji(active.emoji)
        setIsActive(active.isActive !== false)
        setLinesText(active.lines.join('\n'))
      }
      setIntroText(settings.introText ?? '')
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const lines = linesText.split('\n').map(l => l.trim()).filter(Boolean)
    try {
      await Promise.all([
        updateGlobalSettings({ introText }),
        notice
          ? updateNotice(notice.id, { emoji, lines, isActive })
          : addNotice({ emoji, lines, isActive }).then(id =>
              setNotice({ id, emoji, lines, isActive, updatedAt: new Date() } as NoticeConfig)
            ),
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
      showToast('儲存失敗', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-[var(--color-text-muted)] text-sm">載入中...</div>

  return (
    <div className="flex flex-col gap-6">
      {/* 介紹文字 */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded p-4 flex flex-col gap-3 shadow-[var(--shadow-glow-warm)]">
        <h3 className="text-[var(--color-gold-primary)] text-sm font-semibold tracking-widest">介紹文字</h3>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--color-text-muted)]">顯示於菜單頁注意事項上方，留空則不顯示</label>
          <textarea
            value={introText}
            onChange={e => setIntroText(e.target.value)}
            rows={6}
            readOnly={!canWrite}
            placeholder={"歡迎光臨！\n今日特餐：…"}
            className="bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded px-3 py-2 text-sm
                       text-[var(--color-text-primary)] placeholder-[#6a5030] focus:outline-none
                       focus:border-[var(--color-gold-primary)] resize-y leading-relaxed transition-colors"
          />
        </div>
      </div>

      {/* 注意事項看板 */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded p-4 flex flex-col gap-3 shadow-[var(--shadow-glow-warm)]">
        <div className="flex items-center justify-between">
          <h3 className="text-[var(--color-gold-primary)] text-sm font-semibold tracking-widest">注意事項看板</h3>
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              disabled={!canWrite}
              className="accent-[var(--color-gold-primary)]"
            />
            顯示看板
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--color-text-muted)]">看板圖標 (Emoji)</label>
          <input
            type="text"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            placeholder="📢"
            readOnly={!canWrite}
            className="bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded px-3 py-2 text-sm
                       text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-gold-primary)] w-20"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--color-text-muted)]">看板內容（每一行為一條內容）</label>
          <textarea
            value={linesText}
            onChange={e => setLinesText(e.target.value)}
            placeholder={"第一行內容\n第二行內容..."}
            rows={5}
            readOnly={!canWrite}
            className="bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded px-3 py-2 text-sm
                       text-[var(--color-text-primary)] placeholder-[#6a5030] focus:outline-none
                       focus:border-[var(--color-gold-primary)] resize-none transition-colors"
          />
        </div>
      </div>

      {/* 統一儲存 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !canWrite}
          className="bg-[var(--color-gold-primary)] text-[var(--color-bg-primary)] text-sm font-semibold px-5 py-1.5 rounded
                     hover:bg-[var(--color-gold-light)] disabled:opacity-50 transition-colors"
        >
          {saving ? '儲存中…' : '儲存全部'}
        </button>
        {saved && <span className="text-green-400 text-xs">✓ 已儲存</span>}
      </div>
      <Toast toast={toast} />
    </div>
  )
}
