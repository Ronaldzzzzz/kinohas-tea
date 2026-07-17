import type { Popup } from '../../types'

interface Props {
  banners: Popup[]
}

/** 左右直幅假廣告：仿早期入口網站 skyscraper ad，桌面(≥1024px)固定於視窗兩側 */
export default function SidebarBanners({ banners }: Props) {
  const left = banners.filter(b => b.position === 'left').slice(0, 2)
  const right = banners.filter(b => b.position === 'right').slice(0, 2)

  const renderStack = (items: Popup[], side: 'left' | 'right') => (
    <div className={`hidden lg:flex fixed top-24 ${side === 'left' ? 'left-4' : 'right-4'} z-30 flex-col gap-3`}>
      {items.map(banner => {
        const img = (
          <img
            src={banner.imageUrl}
            alt=""
            className="w-32 xl:w-40 rounded shadow-lg animate-pulse"
            draggable={false}
          />
        )
        return (
          <div
            key={banner.id}
            className="border-2 border-[var(--color-gold-primary)] rounded p-1 bg-[var(--color-bg-card)]"
          >
            <p className="text-center text-[9px] tracking-widest text-[var(--color-gold-primary)] mb-0.5">⚡ 熱門廣告 ⚡</p>
            {banner.linkUrl ? (
              <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer">{img}</a>
            ) : img}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      {left.length > 0 && renderStack(left, 'left')}
      {right.length > 0 && renderStack(right, 'right')}
    </>
  )
}
