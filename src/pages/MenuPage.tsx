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
      {/* Hero：跳脫 max-w-4xl 容器，滿版呈現，仿茶莊一頁式官網的首屏 */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden bg-gradient-to-b from-[var(--color-bg-card-hover)] via-[var(--color-bg-primary)] to-[var(--color-bg-primary)] border-b border-[var(--color-border-gold)]">
        <span
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-8 -top-10 font-serif text-[14rem] sm:text-[20rem] leading-none text-[var(--color-gold-primary)] opacity-[0.06]"
        >
          茶
        </span>
        <div className="relative px-4 py-16 sm:py-24 md:py-32 text-center max-w-3xl mx-auto">
          <p className="font-serif text-xs sm:text-sm tracking-[0.4em] text-[var(--color-text-muted)] mb-4">台式茶莊 · FF14 RP</p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-widest text-[var(--color-gold-primary)] mb-4">✦ 木葉茗茶坊 ✦</h1>
          <p className="font-serif text-sm sm:text-base tracking-widest text-[var(--color-text-muted)] mb-6">Kinnoha's Tea</p>
          <div className="mx-auto max-w-xs wave-divider" />
          <p className="mt-6 text-sm sm:text-base text-[var(--color-text-primary)] opacity-80">
            一杯好茶，一段江湖故事
          </p>
        </div>
      </div>

      {/* 分類快速導覽：仿茶莊官網的分類卡片列，滿版呈現 */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[var(--color-bg-card)] border-b border-[var(--color-border-primary)]">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
          <CategoryNav counts={CATEGORY_ORDER.reduce((acc, cat) => {
            acc[cat] = grouped[cat]?.length ?? 0
            return acc
          }, {} as Record<string, number>)} />
        </div>
      </div>

      {introText.trim() && (
        <div className="border border-[var(--color-border-gold)] rounded p-4 sm:p-6 bg-[var(--color-bg-card)]">
          <h2 className="font-serif text-lg sm:text-xl text-[var(--color-gold-primary)] mb-2">關於茶坊</h2>
          <p className="text-[var(--color-text-primary)] text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
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
              <section key={cat} id={`cat-${cat}`} className="scroll-mt-20">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                  <h2 className="text-[var(--color-gold-primary)] font-serif text-xl sm:text-2xl md:text-3xl tracking-widest uppercase">
                    {CATEGORY_LABELS[cat]}
                  </h2>
                  <div className="flex-1 h-px bg-[var(--color-border-gold)] opacity-30" />
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
