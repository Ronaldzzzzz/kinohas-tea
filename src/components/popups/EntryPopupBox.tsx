import type { Popup } from '../../types'

interface Props {
  popup: Popup
  onClose: () => void
  /** 絕對定位的錨點百分比(相對視窗)；不給則置中(單一彈窗舊行為) */
  anchor?: { xPct: number; yPct: number }
  /** -1 隨機不重疊模式使用的絕對像素座標，優先於 anchor */
  pixelPos?: { x: number; y: number }
}

/** Shopee 式進版彈窗盒子：不可點外部關閉，僅右上角小 X 可關 */
export default function EntryPopupBox({ popup, onClose, anchor, pixelPos }: Props) {
  const inner = (
    <>
      {popup.imageUrl && (
        <img src={popup.imageUrl} alt="活動彈窗" className="max-w-[85vw] max-h-[70vh] sm:max-w-xs rounded shadow-2xl" draggable={false} />
      )}
      {popup.text && (
        <p className="bg-[var(--color-bg-card)] text-[var(--color-text-primary)] text-sm p-4 rounded max-w-[85vw] sm:max-w-xs text-center">{popup.text}</p>
      )}
    </>
  )

  const style = pixelPos
    ? { left: pixelPos.x, top: pixelPos.y, transform: 'translate(-50%, -50%)' }
    : anchor
      ? { left: `${anchor.xPct}%`, top: `${anchor.yPct}%`, transform: 'translate(-50%, -50%)' }
      : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <div className="absolute animate-bounce-in" style={style}>
      <button
        onClick={onClose}
        aria-label="關閉彈窗"
        className="absolute -top-2 -right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-bg-card)] text-[var(--color-text-muted)] text-xs shadow hover:text-[var(--color-text-primary)]"
      >
        ✕
      </button>
      {popup.linkUrl ? (
        <a href={popup.linkUrl} target="_blank" rel="noopener noreferrer">{inner}</a>
      ) : inner}
    </div>
  )
}
