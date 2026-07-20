import { useEffect, useState } from 'react'
import type { DirectionsContent } from '../types'
import { getDirectionsContent, getGlobalSettings } from '../lib/firestore'

export default function DirectionsPage() {
  const [content, setContent] = useState<DirectionsContent | null>(null)
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDirectionsContent(), getGlobalSettings()])
      .then(([directions, settings]) => {
        setContent(directions)
        setAddress(settings.address ?? '')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="text-center py-6 sm:py-8">
        <h2 className="font-serif text-xl sm:text-2xl md:text-3xl tracking-[0.3em] text-[var(--color-text-primary)]">交通指引</h2>
        <div className="mx-auto mt-3 h-px w-10 bg-[var(--color-gold-primary)]" />
      </div>

      {loading ? (
        <p className="text-[var(--color-text-muted)] text-sm text-center py-8">載入中…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {content?.title && (
            <h3 className="text-[var(--color-gold-primary)] font-serif text-lg tracking-wide text-center">{content.title}</h3>
          )}
          {content?.mapImageUrl && (
            <img src={content.mapImageUrl} alt="交通地圖" className="w-full rounded shadow-lg object-contain" />
          )}
          {content?.text && (
            <p className="text-[var(--color-text-primary)] text-sm leading-relaxed whitespace-pre-wrap">{content.text}</p>
          )}
          {address && (
            <p className="text-[var(--color-text-muted)] text-sm text-center border-t border-[var(--color-border-primary)] pt-4">
              📍 {address}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
