import type { MenuItem } from '../../types'
import { isOutOfStock } from '../../lib/constants'

interface Props {
  item: MenuItem
  realModeEnabled?: boolean
}

export default function MenuItemRow({ item, realModeEnabled = false }: Props) {
  const outOfStock = isOutOfStock(item, realModeEnabled)
  const dimmed = !item.available || outOfStock

  let statusLabel: string
  let statusClass: string
  if (!item.available) {
    statusLabel = '已售完'
    statusClass = 'bg-[#3a1e1e] text-[#ef9a9a]'
  } else if (outOfStock) {
    statusLabel = '缺貨'
    statusClass = 'bg-[#3a1e1e] text-[#ef9a9a]'
  } else {
    statusLabel = '供應中'
    statusClass = 'bg-[#1e3a1e] text-[#81c784]'
  }

  return (
    <li
      role="listitem"
      className={`flex items-center gap-2 sm:gap-4 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded p-2 sm:p-3 transition-all hover:bg-[var(--color-bg-card-hover)] hover:shadow-[var(--shadow-glow-warm)] ${
        dimmed ? 'opacity-50' : ''
      }`}
    >
      {/* 縮圖 */}
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded bg-[#3a2e18] flex-shrink-0 overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl sm:text-2xl">🍽</div>
        )}
      </div>

      {/* 名稱 + 描述 */}
      <div className="flex-1 min-w-0">
        <div className="text-[#d4c090] font-bold text-base sm:text-lg md:text-xl content-text tracking-wide">
          {item.alias || item.name}
        </div>
        <div className="text-[var(--color-text-muted)] text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1 line-clamp-2 opacity-70 leading-relaxed">{item.description}</div>
      </div>

      {/* 價格 + 狀態 */}
      <div className="flex-shrink-0 text-right">
        <div className="text-[#c9a55a] text-sm sm:text-base font-semibold content-text">{item.price} gil</div>
        <div className={`inline-block mt-1 text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${statusClass}`}>
          {statusLabel}
        </div>
      </div>
    </li>
  )
}
