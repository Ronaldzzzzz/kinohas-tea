import type { MenuItem } from '../../types'
import { isOutOfStock } from '../../lib/constants'

interface Props {
  item: MenuItem
  realModeEnabled?: boolean
}

export default function MenuItemRow({ item, realModeEnabled = false }: Props) {
  const outOfStock = isOutOfStock(item, realModeEnabled)
  const unavailable = !item.available || outOfStock
  const statusLabel = !item.available ? '已售完' : '缺貨'

  return (
    <li
      role="listitem"
      className={`group flex items-start gap-3 bg-[var(--color-bg-card)] rounded overflow-hidden transition-shadow hover:shadow-md ${
        unavailable ? 'opacity-50' : ''
      }`}
    >
      {/* 圖片 */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 self-start bg-[var(--color-bg-card-hover)] overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl">🍵</div>
        )}
        {unavailable && (
          <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]">
            {statusLabel}
          </span>
        )}
      </div>

      {/* 名稱+價格同列、描述完整顯示不截斷 */}
      <div className="flex flex-col justify-center gap-1 py-2 pr-3 min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[var(--color-text-primary)] text-base sm:text-lg content-text tracking-wide truncate min-w-0">
            {item.alias || item.name}
          </span>
          <span className="text-[var(--color-gold-primary)] text-sm sm:text-base font-semibold content-text flex-shrink-0 border border-[var(--color-gold-primary)]/40 rounded-full px-3 py-1">
            {item.price} gil
          </span>
        </div>
        {item.description && (
          <div className="text-[var(--color-text-muted)] text-sm opacity-70 leading-relaxed whitespace-pre-wrap">{item.description}</div>
        )}
      </div>
    </li>
  )
}
