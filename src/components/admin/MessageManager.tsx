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

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getMessages()
    setMessages(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(messageId: string) {
    if (!confirm('確定要刪除此留言（含所有回覆）？')) return
    await deleteMessage(messageId)
    await load()
  }

  async function handleToggleMask(msg: Message) {
    if (msg.masked) {
      await setMessageMask(msg.id, false)
    } else {
      const note = window.prompt('店家註解(選填,直接確定可留空):') ?? ''
      await setMessageMask(msg.id, true, note.trim())
    }
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
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-1">
              <MessageCard message={msg} onDelete={canDelete ? handleDelete : undefined} />
              {/* 後台操作列 */}
              <div className="flex items-center gap-2 pl-1">
                <button
                  onClick={() => handleToggleMask(msg)}
                  className="text-xs px-2 py-0.5 rounded border border-[var(--color-border-gold)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {msg.masked ? '解除遮蔽' : '遮蔽'}
                </button>
                {msg.masked && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    ▓ 已遮蔽{msg.maskNote ? ` · 店家註: ${msg.maskNote}` : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
