import type { ToastState } from '../hooks/useToast'

interface Props {
  toast: ToastState | null
}

export default function Toast({ toast }: Props) {
  if (!toast) return null
  return (
    <div className={`fixed bottom-6 right-6 px-4 py-2 rounded shadow-2xl z-[9999] ${
      toast.type === 'success'
        ? 'bg-[#1e3a1e] text-[#81c784] border border-[#81c784]/30'
        : 'bg-[#3a1e1e] text-[#ef9a9a] border border-[#ef9a9a]/30'
    }`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>{toast.type === 'success' ? '✅' : '❌'}</span>
        {toast.msg}
      </div>
    </div>
  )
}
