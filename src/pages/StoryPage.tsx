import { useEffect, useState } from 'react'
import type { StoryContent } from '../types'
import { getStoryContent } from '../lib/firestore'

export default function StoryPage() {
  const [content, setContent] = useState<StoryContent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStoryContent().then(setContent).catch(err => console.error('載入本店歷史失敗:', err)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="text-center py-6 sm:py-8">
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl tracking-[0.3em] text-[var(--color-text-primary)]">本店歷史</h2>
        <div className="mx-auto mt-3 h-px w-10 bg-[var(--color-gold-primary)]" />
      </div>

      {loading ? (
        <p className="text-[var(--color-text-muted)] text-base text-center py-8">載入中…</p>
      ) : (
        <div className="flex flex-col gap-8 sm:gap-10">
          {content?.sections.map((section, idx) => (
            <section key={idx} className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
              {section.imageUrl && (
                <div className="w-full sm:w-64 flex-shrink-0 flex flex-col items-center">
                  <img
                    src={section.imageUrl}
                    alt={section.title || `本店歷史 ${idx + 1}`}
                    className="w-full rounded shadow-lg object-cover"
                  />
                  {section.imageCaption?.trim() && (
                    <p className="mt-2 text-center text-sm text-[var(--color-text-muted)] tracking-wide">
                      {section.imageCaption}
                    </p>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                {section.title && (
                  <h3 className="text-[var(--color-gold-primary)] font-serif text-xl tracking-wide mb-2">{section.title}</h3>
                )}
                <p className="text-[var(--color-text-primary)] text-base leading-relaxed whitespace-pre-wrap">{section.text}</p>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
