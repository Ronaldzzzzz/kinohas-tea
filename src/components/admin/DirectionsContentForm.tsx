import { useEffect, useState } from 'react'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import { getDirectionsContent, updateDirectionsContent, getGlobalSettings } from '../../lib/firestore'
import { compressImage } from '../../utils/imageCompress'

interface Props {
  canWrite: boolean
}

interface DirectionsForm {
  title: string
  text: string
  file: File | null
  mapImageUrl?: string
}

export default function DirectionsContentForm({ canWrite }: Props) {
  const [form, setForm] = useState<DirectionsForm>({ title: '', text: '', file: null, mapImageUrl: undefined })
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getDirectionsContent(), getGlobalSettings()])
      .then(([content, settings]) => {
        setForm({ title: content.title, text: content.text, file: null, mapImageUrl: content.mapImageUrl })
        setAddress(settings.address ?? '')
      })
      .catch(() => setError('載入失敗'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      let mapImageUrl = form.mapImageUrl
      if (form.file) {
        const blob = await compressImage(form.file)
        const storageRef = ref(storage, `directions-images/${Date.now()}.webp`)
        await uploadBytes(storageRef, blob, { contentType: 'image/webp' })
        const newUrl = await getDownloadURL(storageRef)
        // 換圖成功後才清舊檔，避免上傳失敗時舊圖也被清掉
        if (form.mapImageUrl) {
          try {
            await deleteObject(ref(storage, form.mapImageUrl))
          } catch {
            /* 檔案可能已不存在，忽略 */
          }
        }
        mapImageUrl = newUrl
      }
      await updateDirectionsContent({ title: form.title.trim(), text: form.text.trim(), mapImageUrl })
      setForm(f => ({ ...f, file: null, mapImageUrl }))
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
      <div className="border border-[var(--color-border-gold)] rounded p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[var(--color-text-muted)] text-xs">標題</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            readOnly={!canWrite}
            placeholder="例：怎麼找到我們"
            className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] rounded px-3 py-2 text-sm
                       placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-gold-primary)] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[var(--color-text-muted)] text-xs">說明文字</label>
          <textarea
            value={form.text}
            onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            readOnly={!canWrite}
            rows={5}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] rounded px-3 py-2 text-sm
                       focus:outline-none focus:border-[var(--color-gold-primary)] transition-colors resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          {form.mapImageUrl && !form.file && (
            <img src={form.mapImageUrl} alt="" className="w-16 h-16 object-cover rounded" />
          )}
          {canWrite && (
            <label className="cursor-pointer bg-[var(--color-bg-card-hover)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] text-sm px-4 py-1.5 rounded hover:border-[var(--color-gold-primary)] transition-colors max-w-52 truncate inline-block">
              {form.file ? `已選擇: ${form.file.name}` : form.mapImageUrl ? '更換地圖圖片' : '上傳地圖圖片'}
              <input
                type="file"
                accept="image/*"
                onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))}
                className="hidden"
              />
            </label>
          )}
        </div>

        <p className="text-[var(--color-text-muted)] text-[11px]">
          目前地址：{address || '（未設定）'} — 地址請至「系統設定」調整，此頁僅顯示唯讀值。
        </p>
      </div>

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
            {saving ? '儲存中…' : '儲存交通指引'}
          </button>
          {saved && <span className="text-green-400 text-xs">✓ 已儲存</span>}
          {error && <span className="text-red-400 text-xs">{error}</span>}
        </div>
      )}
    </div>
  )
}
