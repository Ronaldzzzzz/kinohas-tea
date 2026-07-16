import { useState } from 'react'
import { signInWithPassword } from '../../lib/auth'
import type { AdminSession } from '../../types'

interface Props {
  onSuccess: (session: AdminSession) => void
}

export default function PasswordGate({ onSuccess }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const session = await signInWithPassword(password)
      onSuccess(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : '驗證失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--color-bg-card-hover)] border border-[var(--color-text-muted)] rounded p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h2 className="font-serif text-[var(--color-gold-light)] text-center tracking-widest">⚙ 後台管理</h2>
        <div className="h-px bg-[var(--color-border-gold)]" />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="輸入管理密碼"
          autoComplete="current-password"
          className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-gold-primary)]"
        />

        {error && <p className="text-[var(--color-danger-text)] text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="bg-[var(--color-gold-primary)] text-[var(--color-bg-card)] text-sm font-semibold py-2 rounded hover:bg-[var(--color-gold-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '驗證中…' : '進入後台'}
        </button>
      </form>
    </div>
  )
}
