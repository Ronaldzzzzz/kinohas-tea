import type { Popup } from '../../types'

interface Props {
  popup: Popup
  onClose: () => void
}

/** Shopee 式進版彈窗：遮罩不可點關，僅右上角小 X 可關 */
export default function EntryPopup({ popup, onClose }: Props) {
  const inner = (
    <>
      {popup.imageUrl && (
        <img src={popup.imageUrl} alt="活動彈窗" className="max-w-[85vw] max-h-[70vh] sm:max-w-md rounded shadow-2xl" draggable={false} />
      )}
      {popup.text && (
        <p className="bg-[var(--color-bg-card)] text-[var(--color-text-primary)] text-sm p-4 rounded max-w-[85vw] sm:max-w-md text-center">{popup.text}</p>
      )}
    </>
  )
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60">
      <div className="relative animate-bounce-in">
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
    </div>
  )
}
