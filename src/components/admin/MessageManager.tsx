import { useEffect, useState, useCallback } from 'react'
import { getMessages, deleteMessage, setMessageMask } from '../../lib/firestore'
import type { Message } from '../../types'
import MessageCard from '../guestbook/MessageCard'

interface Props {
  canDelete: boolean
}

export default function MessageManager({ canDelete }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getMessages()
    setMessages(data)
    setNoteDrafts(prev => {
      const next = { ...prev }
      data.forEach(m => { if (next[m.id] === undefined) next[m.id] = m.maskNote ?? '' })
      return next
    })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(messageId: string) {
    if (!confirm('確定要刪除此留言（含所有回覆）？')) return
    await deleteMessage(messageId)
    await load()
  }

  async function handleToggleMask(msg: Message) {
    await setMessageMask(msg.id, !msg.masked, noteDrafts[msg.id] ?? msg.maskNote ?? '')
    await load()
  }

  async function handleSaveNote(msg: Message) {
    await setMessageMask(msg.id, msg.masked ?? false, noteDrafts[msg.id] ?? '')
    await load()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-[var(--color-text-muted)] text-sm">{messages.length} 則留言</span>
        <button onClick={load} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">重新整理</button>
      </div>

      {loading ? (
        <p className="text-[var(--color-text-muted)] text-sm">載入中…</p>
      ) : messages.length === 0 ? (
        <p className="text-[var(--color-text-muted)] text-sm text-center py-8">尚無留言</p>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((msg) => {
            const draft = noteDrafts[msg.id] ?? ''
            const noteDirty = draft !== (msg.maskNote ?? '')
            return (
              <div key={msg.id} className="flex flex-col gap-2">
                <MessageCard message={msg} onDelete={canDelete ? handleDelete : undefined} adminView />
                {/* 後台遮蔽操作列：一律顯示原文，遮蔽狀態與管理員附註可隨時編輯 */}
                <div className="flex items-center gap-2 pl-1 flex-wrap">
                  <button
                    onClick={() => handleToggleMask(msg)}
                    className="text-xs px-2 py-0.5 rounded border border-[var(--color-border-gold)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    {msg.masked ? '解除遮蔽' : '遮蔽'}
                  </button>
                  <input
                    value={draft}
                    onChange={(e) => setNoteDrafts(prev => ({ ...prev, [msg.id]: e.target.value }))}
                    placeholder="管理員附註(選填)"
                    className="text-xs bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded px-2 py-0.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] flex-1 min-w-40"
                  />
                  <button
                    onClick={() => handleSaveNote(msg)}
                    disabled={!noteDirty}
                    className="text-xs px-2 py-0.5 rounded bg-[var(--color-gold-primary)] text-[var(--color-bg-primary)] hover:bg-[var(--color-gold-light)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    儲存附註
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
