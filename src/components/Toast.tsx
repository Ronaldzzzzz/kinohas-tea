import type { ToastState } from '../hooks/useToast'

interface Props {
  toast: ToastState | null
}

export default function Toast({ toast }: Props) {
  if (!toast) return null
  return (
    <div className={`fixed bottom-6 right-6 px-4 py-2 rounded shadow-2xl z-[9999] ${
      toast.type === 'success'
        ? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)] border border-[var(--color-success-text)]/30'
        : 'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] border border-[var(--color-danger-text)]/30'
    }`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>{toast.type === 'success' ? '✅' : '❌'}</span>
        {toast.msg}
      </div>
    </div>
  )
}
