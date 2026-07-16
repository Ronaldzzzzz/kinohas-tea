import type { MenuCategory } from '../../types'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../types'

interface Props {
  active: MenuCategory
  onChange: (cat: MenuCategory) => void
}

export default function CategoryTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-1 flex-wrap">
      {CATEGORY_ORDER.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-4 py-1.5 text-sm rounded transition-colors ${
            active === cat
              ? 'bg-[var(--color-gold-primary)] text-[var(--color-bg-card)] font-semibold'
              : 'bg-[var(--color-bg-card-hover)] border border-[var(--color-border-gold)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  )
}
