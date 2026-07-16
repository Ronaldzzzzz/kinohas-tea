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
      className={`group flex flex-col bg-[var(--color-bg-card)] rounded overflow-hidden transition-shadow hover:shadow-md ${
        unavailable ? 'opacity-50' : ''
      }`}
    >
      {/* 圖片 */}
      <div className="relative w-full aspect-square bg-[var(--color-bg-card-hover)] overflow-hidden">
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
          <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]">
            {statusLabel}
          </span>
        )}
      </div>

      {/* 名稱 + 描述 + 價格：置中排版，仿參考站商品卡 */}
      <div className="flex flex-col items-center gap-1 p-3 text-center">
        <div className="text-[var(--color-text-primary)] text-sm sm:text-base content-text tracking-wide truncate w-full">
          {item.alias || item.name}
        </div>
        {item.description && (
          <div className="text-[var(--color-text-muted)] text-xs line-clamp-2 opacity-70 leading-relaxed">{item.description}</div>
        )}
        <div className="text-[var(--color-gold-primary)] text-sm sm:text-base font-semibold content-text mt-1">{item.price} gil</div>
      </div>
    </li>
  )
}
