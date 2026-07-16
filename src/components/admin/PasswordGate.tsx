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
        className="bg-[#2a2015] border border-[#6a5030] rounded p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h2 className="font-serif text-[#d4af7a] text-center tracking-widest">⚙ 後台管理</h2>
        <div className="h-px bg-[#4a3820]" />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="輸入管理密碼"
          autoComplete="current-password"
          className="bg-[#1a1510] border border-[#4a3820] rounded px-3 py-2 text-sm text-[#d4c090] placeholder-[#6a5030] focus:outline-none focus:border-[#c9a55a]"
        />

        {error && <p className="text-[#ef9a9a] text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="bg-[#c9a55a] text-[#1a1510] text-sm font-semibold py-2 rounded hover:bg-[#d4af7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '驗證中…' : '進入後台'}
        </button>
      </form>
    </div>
  )
}
