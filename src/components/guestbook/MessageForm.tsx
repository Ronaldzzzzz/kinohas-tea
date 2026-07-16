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
      className="bg-[var(--color-bg-card-hover)] border border-[var(--color-border-gold)] rounded p-4 flex flex-col gap-3"
    >
      <h3 className="text-[var(--color-gold-primary)] text-sm font-semibold tracking-wide">留下心語</h3>

      <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="accent-[var(--color-gold-primary)]"
        />
        匿名留言
      </label>

      {!isAnonymous && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={authorId}
            onChange={(e) => setAuthorId(e.target.value)}
            placeholder="角色 ID"
            className="flex-1 min-w-0 bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-gold-primary)]"
          />
          <input
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            placeholder="伺服器名稱"
            className="flex-1 min-w-0 bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-gold-primary)]"
          />
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="寫下你的留言…"
        rows={3}
        required
        className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-gold-primary)] resize-none"
      />

      <button
        type="submit"
        disabled={submitting || !content.trim()}
        className="self-end bg-[var(--color-gold-primary)] text-[var(--color-bg-card)] text-sm font-semibold px-5 py-1.5 rounded hover:bg-[var(--color-gold-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? '送出中…' : '送出'}
      </button>
    </form>
  )
}
