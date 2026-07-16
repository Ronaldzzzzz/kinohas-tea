/**
 * 本店特色區塊：對應參考站(松山茗茶)首頁的四格 highlight 磚。
 * 固定四格介紹店家，不隨菜單資料變動。
 */
const HIGHLIGHTS = [
  { icon: '🍃', title: '嚴選茶葉', desc: '精選高山茶葉，職人手工揀選' },
  { icon: '🫖', title: '現點現泡', desc: '每一壺茶皆現場沖泡，溫度剛好' },
  { icon: '🏮', title: '台式風情', desc: '燈籠與木香之間，一口台灣味' },
  { icon: '📖', title: '以茶會友', desc: '歡迎搭話交流，聽一段江湖故事' },
] as const

export default function ShopHighlights() {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
      {HIGHLIGHTS.map(({ icon, title, desc }) => (
        <div
          key={title}
          className="group relative flex flex-col items-center justify-center text-center aspect-[4/3] rounded overflow-hidden px-3 bg-gradient-to-br from-[var(--color-deep-green)] to-[var(--color-deep-green-light)] transition-transform hover:scale-[1.02] hover:shadow-lg"
        >
          <span className="text-3xl sm:text-4xl mb-2 transition-transform group-hover:scale-110">{icon}</span>
          <span className="font-serif text-sm sm:text-base text-[var(--color-on-deep)] tracking-[0.25em]">
            {title}
          </span>
          <span className="text-[10px] sm:text-xs text-[var(--color-on-deep)] opacity-60 mt-1.5 leading-relaxed">
            {desc}
          </span>
        </div>
      ))}
    </div>
  )
}
