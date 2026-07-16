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
              ? 'bg-[#c9a55a] text-[#1a1510] font-semibold'
              : 'bg-[#2a2015] border border-[#4a3820] text-[#9a8a70] hover:text-[#d4c090]'
          }`}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  )
}
