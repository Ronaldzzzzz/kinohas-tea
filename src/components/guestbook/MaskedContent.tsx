import { useEffect, useState, type CSSProperties } from 'react'

interface Props {
  content: string
  maskNote?: string
}

const PARTICLE_COUNT = 28

interface Particle {
  id: number
  style: CSSProperties
}

/** 粒子隨機散布在整個文字區塊範圍內(而非單一定點)，各自往隨機方向飄散消失，模擬迷霧整片散開 */
function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const dx = (Math.random() - 0.5) * 36
    const dy = -8 - Math.random() * 24
    return {
      id: i,
      style: {
        left: `${5 + Math.random() * 90}%`,
        top: `${10 + Math.random() * 80}%`,
        '--pdx': `${dx}px`,
        '--pdy': `${dy}px`,
        animationDelay: `${Math.random() * 0.15}s`,
      } as CSSProperties,
    }
  })
}

/** 遮蔽呈現：原文模糊化，點擊切換顯示/重新遮蔽；解除迷霧瞬間播放粒子飛散動畫 */
export default function MaskedContent({ content, maskNote }: Props) {
  const [revealed, setRevealed] = useState(false)
  const [particles, setParticles] = useState<Particle[] | null>(null)

  useEffect(() => {
    if (!particles) return
    const timer = setTimeout(() => setParticles(null), 600)
    return () => clearTimeout(timer)
  }, [particles])

  function toggle() {
    setRevealed(r => {
      if (!r) setParticles(createParticles())
      return !r
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={toggle} aria-pressed={revealed} className="relative text-left">
        <p
          aria-hidden={!revealed}
          className={`text-sm sm:text-base leading-relaxed text-[var(--color-text-primary)] break-all transition-[filter,opacity] duration-300 ${
            revealed ? '' : 'blur select-none opacity-50'
          }`}
        >
          {content}
        </p>
        {!revealed && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-card)]/80 px-2 py-0.5 rounded">
              點擊可顯示內容
            </span>
          </span>
        )}
        {particles && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible">
            {particles.map(p => (
              <span
                key={p.id}
                style={p.style}
                className="absolute w-1 h-1 rounded-full bg-[var(--color-gold-primary)] animate-particle"
              />
            ))}
          </span>
        )}
      </button>
      <p className="text-xs sm:text-sm text-[var(--color-text-primary)] tracking-wider">
        ▓ 此留言已被管理員遮蔽{maskNote ? `：${maskNote}` : ''}
      </p>
    </div>
  )
}
