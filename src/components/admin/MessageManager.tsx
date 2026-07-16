import { useEffect, useState, useCallback } from 'react'
import { getMessages, deleteMessage } from '../../lib/firestore'
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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-[#9a8a70] text-sm">{messages.length} 則留言</span>
        <button onClick={load} className="text-xs text-[#9a8a70] hover:text-[#d4c090]">重新整理</button>
      </div>

      {loading ? (
        <p className="text-[#9a8a70] text-sm">載入中…</p>
      ) : messages.length === 0 ? (
        <p className="text-[#9a8a70] text-sm text-center py-8">尚無留言</p>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <MessageCard key={msg.id} message={msg} onDelete={canDelete ? handleDelete : undefined} />
          ))}
        </div>
      )}
    </div>
  )
}
