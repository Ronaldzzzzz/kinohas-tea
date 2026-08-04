import { useState } from 'react'
import type { MarqueeItem } from '../../types'
import MarqueeBar from './MarqueeBar'

interface Props {
  items: MarqueeItem[]
}

/** 同一位置依序輪播最多三則跑馬燈，各自使用自己的速度；跑完一則自動換下一則。 */
export default function MarqueeCarousel({ items }: Props) {
  const active = items.filter(item => item.text.trim())
  const [index, setIndex] = useState(0)

  if (active.length === 0) return null

  // 儲存文字被改到剩較少則時，index 可能超出範圍，取餘數修正而不是等 effect
  const current = active[index % active.length]

  return (
    <MarqueeBar
      key={index}
      text={current.text}
      speed={current.speed}
      onFinished={() => setIndex(i => (i + 1) % active.length)}
    />
  )
}
