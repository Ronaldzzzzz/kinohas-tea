import { useRef, useState } from 'react'
import type { Popup } from '../../types'

interface Props {
  popup: Popup
  initial: { x: number; y: number }
  zIndex: number
  onFocus: () => void
  onClose: () => void
}

/** zutomayo 式可拖動視窗：標題列拖曳(pointer events)，點擊置頂 */
export default function FloatingWindow({ popup, initial, zIndex, onFocus, onClose }: Props) {
  const [pos, setPos] = useState(initial)
  const drag = useRef<{ dx: number; dy: number; w: number; h: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  function onPointerDown(e: React.PointerEvent) {
    const el = rootRef.current
    drag.current = {
      dx: e.clientX - pos.x,
      dy: e.clientY - pos.y,
      w: el?.offsetWidth ?? 0,
      h: el?.offsetHeight ?? 0,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    onFocus()
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    const { dx, dy, w, h } = drag.current
    setPos({
      x: Math.max(0, Math.min(Math.max(0, window.innerWidth - w), e.clientX - dx)),
      y: Math.max(0, Math.min(Math.max(0, window.innerHeight - h), e.clientY - dy)),
    })
  }
  function onPointerUp() { drag.current = null }

  return (
    <div
      ref={rootRef}
      style={{ left: pos.x, top: pos.y, zIndex }}
      className="fixed w-56 sm:w-64 rounded shadow-2xl overflow-hidden border border-[var(--color-border-gold)] bg-[var(--color-bg-card)]"
      onPointerDown={onFocus}
    >
      {/* 標題列 */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex items-center justify-between px-2 py-1 bg-[var(--color-deep-green)] text-[var(--color-on-deep)] cursor-move touch-none select-none"
      >
        <span className="text-xs tracking-wider">📢 木葉茗茶坊</span>
        <button onClick={onClose} onPointerDown={e => e.stopPropagation()} aria-label="關閉視窗" className="text-xs px-1 hover:opacity-70">✕</button>
      </div>
      {popup.imageUrl && <img src={popup.imageUrl} alt="" className="w-full" draggable={false} />}
      {popup.text && <p className="p-3 text-xs text-[var(--color-text-primary)] leading-relaxed">{popup.text}</p>}
    </div>
  )
}
