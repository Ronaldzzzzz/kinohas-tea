interface Props {
  text: string
}

/** 跑馬燈：CSS 動畫等效實作(不用已廢棄的 <marquee> 標籤)，內容重複兩次無縫循環 */
export default function MarqueeBar({ text }: Props) {
  if (!text.trim()) return null

  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden bg-[var(--color-deep-green)] border-y border-[var(--color-gold-primary)]/30 py-2">
      <div className="marquee-track flex whitespace-nowrap w-max">
        <span className="text-sm text-[var(--color-on-deep)] tracking-wider px-8">📣 {text}</span>
        <span className="text-sm text-[var(--color-on-deep)] tracking-wider px-8" aria-hidden="true">📣 {text}</span>
      </div>
    </div>
  )
}
