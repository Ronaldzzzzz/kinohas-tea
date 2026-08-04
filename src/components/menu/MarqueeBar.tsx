import { useState } from 'react'

interface Props {
  text: string
  speed?: 'slow' | 'medium' | 'fast' | 'ultraFast'
  onFinished?: () => void
}

const SPEED_DURATION_SEC: Record<'slow' | 'medium' | 'fast' | 'ultraFast', number> = {
  slow: 20,
  medium: 14,
  fast: 8,
  ultraFast: 4,
}

/**
 * 跑馬燈單行：固定貼在視窗最下方，CSS 動畫等效實作(不用已廢棄的 <marquee> 標籤)。
 * 用 translateX(100vw) → translateX(-100%) 讓文字從螢幕右外側完整滑到左外側，
 * 不論文字長短都會橫越整個可視寬度(舊版雙份拼接寫法在文字較短時只在畫面局部小幅移動，位置觀感不對)。
 * 動畫只跑一輪(iterationCount 1)，跑完呼叫 onFinished 交由外層輪播換下一則。
 */
export default function MarqueeBar({ text, speed = 'medium', onFinished }: Props) {
  const [paused, setPaused] = useState(false)
  if (!text.trim()) return null

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-30 overflow-hidden bg-[var(--color-deep-green)] border-t border-[var(--color-gold-primary)]/30 py-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span
        className="marquee-track inline-block whitespace-nowrap text-sm text-[var(--color-on-deep)] tracking-wider"
        style={{
          animationDuration: `${SPEED_DURATION_SEC[speed]}s`,
          animationPlayState: paused ? 'paused' : 'running',
          animationIterationCount: 1,
          // 動畫跑完瀏覽器預設會把 transform 還原成初始值(等於跳回畫面內)，
          // 換下一則之前那一瞬間就會閃回來一下；用 forwards 讓它停在滑出畫面的終點狀態
          animationFillMode: 'forwards',
        }}
        onAnimationEnd={onFinished}
      >
        📣 {text}
      </span>
    </div>
  )
}
