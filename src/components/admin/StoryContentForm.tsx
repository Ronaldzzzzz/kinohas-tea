import { useEffect, useState } from 'react'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import { getStoryContent, updateStoryContent } from '../../lib/firestore'
import { compressImage } from '../../utils/imageCompress'
import type { StorySection } from '../../types'

interface Props {
  canWrite: boolean
}

interface SectionForm {
  title: string
  text: string
  file: File | null
  imageUrl?: string
}

const SECTION_LABELS = ['段落 1（照片必填）', '段落 2（照片選填）', '段落 3（照片選填）']

function toSectionForm(s: StorySection): SectionForm {
  return { title: s.title, text: s.text, file: null, imageUrl: s.imageUrl }
}

export default function StoryContentForm({ canWrite }: Props) {
  const [sections, setSections] = useState<SectionForm[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getStoryContent()
      .then(content => setSections(content.sections.map(toSectionForm)))
      .catch(() => setError('載入失敗'))
      .finally(() => setLoading(false))
  }, [])

  function updateSection(idx: number, patch: Partial<SectionForm>) {
    setSections(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  async function handleSave() {
    if (!sections[0]?.file && !sections[0]?.imageUrl) {
      setError('段落 1 的照片為必填')
      return
    }
    setSaving(true)
    setError('')
    try {
      const uploaded = await Promise.all(
        sections.map(async (s, i) => {
          let imageUrl = s.imageUrl
          if (s.file) {
            const blob = await compressImage(s.file)
            const storageRef = ref(storage, `story-images/${Date.now()}-${i}.webp`)
            await uploadBytes(storageRef, blob, { contentType: 'image/webp' })
            const newUrl = await getDownloadURL(storageRef)
            // 換圖成功後才清舊檔，避免上傳失敗時舊圖也被清掉
            if (s.imageUrl) {
              try {
                await deleteObject(ref(storage, s.imageUrl))
              } catch {
                /* 檔案可能已不存在，忽略 */
              }
            }
            imageUrl = newUrl
          }
          return { title: s.title.trim(), text: s.text.trim(), imageUrl }
        })
      )
      await updateStoryContent({ sections: uploaded as [StorySection, StorySection, StorySection] })
      setSections(uploaded.map(s => ({ ...s, file: null })))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('儲存失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-[var(--color-text-muted)] text-sm py-4">載入中…</p>
  }

  return (
    <div className="flex flex-col gap-5">
      {sections.map((section, idx) => (
        <div key={idx} className="border border-[var(--color-border-gold)] rounded p-4 flex flex-col gap-3">
          <h4 className="text-[var(--color-gold-primary)] text-xs font-semibold tracking-wide">{SECTION_LABELS[idx]}</h4>

          <div className="flex flex-col gap-1.5">
            <label className="text-[var(--color-text-muted)] text-xs">標題</label>
            <input
              type="text"
              value={section.title}
              onChange={e => updateSection(idx, { title: e.target.value })}
              readOnly={!canWrite}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] rounded px-3 py-2 text-sm
                         focus:outline-none focus:border-[var(--color-gold-primary)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[var(--color-text-muted)] text-xs">文字內容</label>
            <textarea
              value={section.text}
              onChange={e => updateSection(idx, { text: e.target.value })}
              readOnly={!canWrite}
              rows={4}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] rounded px-3 py-2 text-sm
                         focus:outline-none focus:border-[var(--color-gold-primary)] transition-colors resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            {section.imageUrl && !section.file && (
              <img src={section.imageUrl} alt="" className="w-16 h-16 object-cover rounded" />
            )}
            {canWrite && (
              <label className="cursor-pointer bg-[var(--color-bg-card-hover)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] text-sm px-4 py-1.5 rounded hover:border-[var(--color-gold-primary)] transition-colors max-w-52 truncate inline-block">
                {section.file ? `已選擇: ${section.file.name}` : section.imageUrl ? '更換照片' : '上傳照片'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => updateSection(idx, { file: e.target.files?.[0] ?? null })}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      ))}

      {canWrite && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-1.5 text-sm rounded border transition-colors
                       border-[var(--color-gold-primary)] text-[var(--color-gold-primary)]
                       hover:bg-[var(--color-gold-primary)] hover:text-[var(--color-bg-primary)]
                       disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {saving ? '儲存中…' : '儲存本店歷史'}
          </button>
          {saved && <span className="text-green-400 text-xs">✓ 已儲存</span>}
          {error && <span className="text-red-400 text-xs">{error}</span>}
        </div>
      )}
    </div>
  )
}
