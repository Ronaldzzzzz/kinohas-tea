import { useEffect, useState, useCallback } from 'react'
import type { Message } from '../types'
import { getMessages } from '../lib/firestore'
import MessageCard from '../components/guestbook/MessageCard'
import MessageForm from '../components/guestbook/MessageForm'
import NoticeBanner from '../components/NoticeBanner'

export default function GuestbookPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    getMessages()
      .then(setMessages)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="text-center py-6 sm:py-8">
        <h2 className="font-serif text-xl sm:text-2xl md:text-3xl tracking-[0.3em] text-[var(--color-text-primary)]">留言板</h2>
        <div className="mx-auto mt-3 h-px w-10 bg-[var(--color-gold-primary)]" />
      </div>

      <NoticeBanner />

      <MessageForm onSubmitted={load} />

      <div className="flex flex-col gap-2 sm:gap-3">
        {loading ? (
          <p className="text-[var(--color-text-muted)] text-sm text-center py-8">載入中…</p>
        ) : messages.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-sm text-center py-8">尚無留言，歡迎第一個留言！</p>
        ) : (
          messages.map((msg) => <MessageCard key={msg.id} message={msg} />)
        )}
      </div>
    </div>
  )
}
