import { useEffect, useRef, useState } from 'react'
import type { Popup } from '../../types'

interface Props {
  popup: Popup
  initial: { x: number; y: number }
  zIndex: number
  onFocus: () => void
  onClose: () => void
}

// 右邊界額外留白，避免視窗貼齊螢幕最右側
const RIGHT_MARGIN = 16

/** zutomayo 式可拖動視窗：標題列拖曳(pointer events)，點擊置頂 */
export default function FloatingWindow({ popup, initial, zIndex, onFocus, onClose }: Props) {
  const [pos, setPos] = useState(initial)
  const drag = useRef<{ dx: number; dy: number; w: number; h: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // randomPos() 算初始座標時不知道視窗實際寬高(尤其圖片載入後高度會變)，
  // 只在拖曳時夾範圍是不夠的：一開場就可能半個跑到畫面外。掛載後及尺寸變動時(如圖片載入完成)重新夾一次。
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const clamp = () => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      setPos(p => ({
        x: Math.max(0, Math.min(Math.max(0, window.innerWidth - w - RIGHT_MARGIN), p.x)),
        y: Math.max(0, Math.min(Math.max(0, window.innerHeight - h), p.y)),
      }))
    }
    clamp()
    const ro = new ResizeObserver(clamp)
    ro.observe(el)
    window.addEventListener('resize', clamp)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', clamp)
    }
  }, [])

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
      x: Math.max(0, Math.min(Math.max(0, window.innerWidth - w - RIGHT_MARGIN), e.clientX - dx)),
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
