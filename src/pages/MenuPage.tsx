import { useEffect, useState, useMemo } from 'react'
import type { MenuItem, PhotoUrl } from '../types'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../types'
import { getMenuItems, getGlobalSettings } from '../lib/firestore'
import MenuItemRow from '../components/menu/MenuItemRow'
import ShopHighlights from '../components/menu/ShopHighlights'
import HeroCarousel from '../components/menu/HeroCarousel'
import NoticeBanner from '../components/NoticeBanner'
import OrderForm from '../components/OrderForm'

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [realModeEnabled, setRealModeEnabled] = useState(false)
  const [introText, setIntroText] = useState('')
  const [heroPhotos, setHeroPhotos] = useState<PhotoUrl[]>([])

  useEffect(() => {
    getMenuItems()
      .then(setItems)
      .finally(() => setLoading(false))
    getGlobalSettings()
      .then(settings => {
        setRealModeEnabled(settings.realModeEnabled ?? false)
        setIntroText(settings.introText ?? '')
        setHeroPhotos(settings.photoUrls ?? [])
      })
      .catch(() => {})
  }, [])

  const grouped = useMemo(() => CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat)
    return acc
  }, {} as Record<string, MenuItem[]>), [items])

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-12">
      {/* Hero：滿版滿高深茶綠形象區，導覽列透明疊於其上，營造進站沉浸感 */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-20 sm:-mt-24 w-screen min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--color-deep-green)] to-[var(--color-deep-green-light)]">
        {/* 系統設定的宣傳照輪播；無照片時 fallback 為上方純色漸層 */}
        <HeroCarousel photos={heroPhotos} />
        <span
          aria-hidden="true"
          className="pointer-events-none select-none absolute z-10 -right-8 top-1/2 -translate-y-1/2 font-serif text-[18rem] sm:text-[28rem] leading-none text-[var(--color-on-deep)] opacity-[0.07]"
        >
          茶
        </span>
        <div className="relative z-10 px-4 text-center max-w-3xl mx-auto">
          <p className="font-serif text-xs sm:text-sm tracking-[0.4em] text-[var(--color-on-deep)] opacity-70 mb-6">台式茶莊 · FF14 RP</p>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold tracking-widest text-[var(--color-on-deep)] mb-4">木葉茗茶坊</h1>
          <p className="text-xs sm:text-sm tracking-[0.35em] text-[var(--color-on-deep)] opacity-60 mb-10">KINOHA'S TEA</p>
          <p className="text-sm sm:text-base text-[var(--color-on-deep)] opacity-80">
            一杯好茶，一段江湖故事
          </p>
        </div>
        {/* 捲動提示 */}
        <a
          href="#highlights"
          aria-label="向下捲動"
          className="absolute z-10 bottom-8 left-1/2 -translate-x-1/2 text-[var(--color-on-deep)] opacity-60 hover:opacity-100 transition-opacity animate-bounce text-xl"
        >
          ↓
        </a>
      </div>

      {/* 本店特色：對應參考站的四格 highlight 磚，固定內容不隨菜單變動 */}
      <div id="highlights" className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[var(--color-bg-primary)] scroll-mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
          <ShopHighlights />
        </div>
      </div>

      {introText.trim() && (
        <div className="text-center py-6 sm:py-8 max-w-2xl mx-auto">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--color-gold-primary)] tracking-[0.3em] mb-1">關於茶坊</h2>
          <p className="text-[10px] tracking-[0.3em] text-[var(--color-text-muted)] uppercase mb-5">About Us</p>
          <p className="text-[var(--color-text-primary)] text-sm sm:text-base leading-loose whitespace-pre-wrap">
            {introText}
          </p>
        </div>
      )}

      <NoticeBanner />

      {/* 品項清單 (分組顯示，卡片網格排列) */}
      <div className="flex flex-col gap-8 sm:gap-10 md:gap-12">
        {loading ? (
          <p className="text-[var(--color-text-muted)] text-sm text-center py-8">載入中…</p>
        ) : items.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-sm text-center py-8">目前無菜單品項</p>
        ) : (
          CATEGORY_ORDER.map(cat => (
            grouped[cat].length > 0 && (
              <section key={cat} id={`cat-${cat}`} className="scroll-mt-24">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-[var(--color-text-primary)] font-serif text-xl sm:text-2xl md:text-3xl tracking-[0.3em]">
                    {CATEGORY_LABELS[cat]}
                  </h2>
                  <div className="mx-auto mt-3 h-px w-10 bg-[var(--color-gold-primary)]" />
                </div>
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {grouped[cat].map((item) => (
                    <MenuItemRow key={item.id} item={item} realModeEnabled={realModeEnabled} />
                  ))}
                </ul>
              </section>
            )
          ))
        )}
      </div>

      <OrderForm menuItems={items.filter(i => i.available !== false)} />
    </div>
  )
}
