interface Props {
  text: string
}

/**
 * 跑馬燈：固定貼在視窗最下方，CSS 動畫等效實作(不用已廢棄的 <marquee> 標籤)。
 * 用 translateX(100vw) → translateX(-100%) 讓文字從螢幕右外側完整滑到左外側，
 * 不論文字長短都會橫越整個可視寬度(舊版雙份拼接寫法在文字較短時只在畫面局部小幅移動，位置觀感不對)。
 */
export default function MarqueeBar({ text }: Props) {
  if (!text.trim()) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 overflow-hidden bg-[var(--color-deep-green)] border-t border-[var(--color-gold-primary)]/30 py-2">
      <span className="marquee-track inline-block whitespace-nowrap text-sm text-[var(--color-on-deep)] tracking-wider">
        📣 {text}
      </span>
    </div>
  )
}
