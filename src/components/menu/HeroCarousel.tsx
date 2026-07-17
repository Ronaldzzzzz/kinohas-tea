import { useEffect, useState } from 'react'
import type { PhotoUrl } from '../../types'
import { getUrl } from '../../utils/photoUtils'

interface Props {
  photos: PhotoUrl[]
  intervalMs?: number
}

/** Hero 主視覺輪播：系統設定的宣傳照滿版輪播，蓋一層暗色遮罩維持文字可讀性 */
export default function HeroCarousel({ photos, intervalMs = 5000 }: Props) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (photos.length <= 1) return
    const timer = setInterval(() => setIndex(i => (i + 1) % photos.length), intervalMs)
    return () => clearInterval(timer)
  }, [photos.length, intervalMs])

  if (photos.length === 0) return null

  return (
    <div className="absolute inset-0 z-0" aria-hidden="true">
      {photos.map((photo, i) => (
        <div
          key={getUrl(photo)}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${getUrl(photo)})`,
            opacity: i === index ? 1 : 0,
          }}
        />
      ))}
      {/* 暗色遮罩：確保上方文字在任何照片上都清晰可讀 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-deep-green)]/85 to-[var(--color-deep-green-light)]/80" />
    </div>
  )
}
