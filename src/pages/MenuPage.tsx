import { useEffect, useState, useMemo } from 'react'
import type { MenuItem } from '../types'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../types'
import { getMenuItems, getGlobalSettings } from '../lib/firestore'
import MenuItemRow from '../components/menu/MenuItemRow'
import CategoryNav from '../components/menu/CategoryNav'
import NoticeBanner from '../components/NoticeBanner'
import OrderForm from '../components/OrderForm'

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [realModeEnabled, setRealModeEnabled] = useState(false)
  const [introText, setIntroText] = useState('')

  useEffect(() => {
    getMenuItems()
      .then(setItems)
      .finally(() => setLoading(false))
    getGlobalSettings()
      .then(settings => {
        setRealModeEnabled(settings.realModeEnabled ?? false)
        setIntroText(settings.introText ?? '')
      })
      .catch(() => {})
  }, [])

  const grouped = useMemo(() => CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat)
    return acc
  }, {} as Record<string, MenuItem[]>), [items])

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-12">
      {/* Hero：滿版深茶綠形象區，對應參考站的滿版形象大圖 */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-6 w-screen overflow-hidden bg-gradient-to-br from-[var(--color-deep-green)] to-[var(--color-deep-green-light)]">
        <span
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-8 -top-10 font-serif text-[14rem] sm:text-[20rem] leading-none text-[var(--color-on-deep)] opacity-[0.07]"
        >
          茶
        </span>
        <div className="relative px-4 py-20 sm:py-28 md:py-36 text-center max-w-3xl mx-auto">
          <p className="font-serif text-xs sm:text-sm tracking-[0.4em] text-[var(--color-on-deep)] opacity-70 mb-4">台式茶莊 · FF14 RP</p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-widest text-[var(--color-on-deep)] mb-3">木葉茗茶坊</h1>
          <p className="text-xs sm:text-sm tracking-[0.35em] text-[var(--color-on-deep)] opacity-60 mb-8">KINNOHA'S TEA</p>
          <p className="text-sm sm:text-base text-[var(--color-on-deep)] opacity-80">
            一杯好茶，一段江湖故事
          </p>
        </div>
      </div>

      {/* 分類磚：對應參考站的帶圖分類磚列 */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[var(--color-bg-primary)]">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
          <CategoryNav counts={CATEGORY_ORDER.reduce((acc, cat) => {
            acc[cat] = grouped[cat]?.length ?? 0
            return acc
          }, {} as Record<string, number>)} />
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
