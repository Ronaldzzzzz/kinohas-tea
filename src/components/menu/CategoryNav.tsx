import type { MenuCategory } from '../../types'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../types'

const CATEGORY_ICONS: Record<MenuCategory, string> = {
  appetizer: '🥟',
  main: '🍚',
  dessert: '🍡',
  drink: '🍵',
  set: '🍱',
}

interface Props {
  counts: Record<string, number>
}

/**
 * 分類磚列：對應參考站(松山茗茶)首頁的帶圖分類磚。
 * 無商品攝影可用，改以深茶綠色塊+大型圖示模擬圖磚，label 壓在磚上。
 */
export default function CategoryNav({ counts }: Props) {
  const visible = CATEGORY_ORDER.filter((cat) => (counts[cat] ?? 0) > 0)
  if (visible.length === 0) return null

  const colClass =
    visible.length === 1 ? 'sm:grid-cols-1' :
    visible.length === 2 ? 'sm:grid-cols-2' :
    visible.length === 3 ? 'sm:grid-cols-3' :
    'sm:grid-cols-4'

  return (
    <nav className={`grid gap-3 sm:gap-4 grid-cols-2 ${colClass}`}>
      {visible.map((cat) => (
        <a
          key={cat}
          href={`#cat-${cat}`}
          className="group relative flex flex-col items-center justify-center aspect-[4/3] rounded overflow-hidden bg-gradient-to-br from-[var(--color-deep-green)] to-[var(--color-deep-green-light)] transition-transform hover:scale-[1.02] hover:shadow-lg"
        >
          <span className="text-4xl sm:text-5xl mb-2 transition-transform group-hover:scale-110">{CATEGORY_ICONS[cat]}</span>
          <span className="font-serif text-sm sm:text-base text-[var(--color-on-deep)] tracking-[0.25em]">
            {CATEGORY_LABELS[cat]}
          </span>
          <span className="text-[10px] text-[var(--color-on-deep)] opacity-50 mt-1">{counts[cat]} 項</span>
        </a>
      ))}
    </nav>
  )
}
