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
    statusClass = 'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]'
  } else if (outOfStock) {
    statusLabel = '缺貨'
    statusClass = 'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]'
  } else {
    statusLabel = '供應中'
    statusClass = 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
  }

  return (
    <li
      role="listitem"
      className={`flex flex-col bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded overflow-hidden transition-all hover:border-[var(--color-border-gold)] hover:shadow-[var(--shadow-glow-warm)] ${
        dimmed ? 'opacity-50' : ''
      }`}
    >
      {/* 圖片 */}
      <div className="w-full aspect-square bg-[var(--color-bg-card-hover)] overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl">🍽</div>
        )}
      </div>

      {/* 名稱 + 描述 + 價格 */}
      <div className="flex flex-col gap-1 p-2 sm:p-3">
        <div className="text-[var(--color-text-primary)] font-bold text-sm sm:text-base content-text tracking-wide truncate">
          {item.alias || item.name}
        </div>
        <div className="text-[var(--color-text-muted)] text-xs line-clamp-2 opacity-70 leading-relaxed min-h-[2.2em]">{item.description}</div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[var(--color-gold-primary)] text-sm sm:text-base font-semibold content-text">{item.price} gil</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
      </div>
    </li>
  )
}
