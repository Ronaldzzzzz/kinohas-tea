import { useState, useRef, useCallback } from 'react'

export type ToastType = 'success' | 'error'

export interface ToastState {
  msg: string
  type: ToastType
}

export function useToast(durationMs = 3000) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ msg, type })
    timerRef.current = setTimeout(() => setToast(null), durationMs)
  }, [durationMs])

  return { toast, showToast }
}
