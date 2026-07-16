import { useState } from 'react'
import { addMessage } from '../../lib/firestore'

interface Props {
  onSubmitted: () => void
}

export default function MessageForm({ onSubmitted }: Props) {
  const [authorId, setAuthorId] = useState('')
  const [serverName, setServerName] = useState('')
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    try {
      await addMessage({
        authorId: isAnonymous ? '' : authorId.trim(),
        serverName: isAnonymous ? '' : serverName.trim(),
        isAnonymous,
        content: content.trim(),
      })
      setContent('')
      onSubmitted()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#2a2015] border border-[#4a3820] rounded p-4 flex flex-col gap-3"
    >
      <h3 className="text-[#c9a55a] text-sm font-semibold tracking-wide">留下心語</h3>

      <label className="flex items-center gap-2 text-xs text-[#9a8a70] cursor-pointer">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="accent-[#c9a55a]"
        />
        匿名留言
      </label>

      {!isAnonymous && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={authorId}
            onChange={(e) => setAuthorId(e.target.value)}
            placeholder="角色 ID"
            className="flex-1 min-w-0 bg-[#1a1510] border border-[#4a3820] rounded px-3 py-1.5 text-sm text-[#d4c090] placeholder-[#6a5030] focus:outline-none focus:border-[#c9a55a]"
          />
          <input
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            placeholder="伺服器名稱"
            className="flex-1 min-w-0 bg-[#1a1510] border border-[#4a3820] rounded px-3 py-1.5 text-sm text-[#d4c090] placeholder-[#6a5030] focus:outline-none focus:border-[#c9a55a]"
          />
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="寫下你的留言…"
        rows={3}
        required
        className="bg-[#1a1510] border border-[#4a3820] rounded px-3 py-2 text-sm text-[#d4c090] placeholder-[#6a5030] focus:outline-none focus:border-[#c9a55a] resize-none"
      />

      <button
        type="submit"
        disabled={submitting || !content.trim()}
        className="self-end bg-[#c9a55a] text-[#1a1510] text-sm font-semibold px-5 py-1.5 rounded hover:bg-[#d4af7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? '送出中…' : '送出'}
      </button>
    </form>
  )
}
