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

export default function CategoryNav({ counts }: Props) {
  return (
    <nav className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
      {CATEGORY_ORDER.map((cat) => {
        const count = counts[cat] ?? 0
        if (count === 0) return null
        return (
          <a
            key={cat}
            href={`#cat-${cat}`}
            className="flex flex-col items-center gap-1 rounded p-2 sm:p-3 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-gold)] hover:shadow-[var(--shadow-glow-warm)] transition-all"
          >
            <span className="text-xl sm:text-2xl">{CATEGORY_ICONS[cat]}</span>
            <span className="font-serif text-xs sm:text-sm text-[var(--color-text-primary)] tracking-wide">
              {CATEGORY_LABELS[cat]}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">{count} 項</span>
          </a>
        )
      })}
    </nav>
  )
}
