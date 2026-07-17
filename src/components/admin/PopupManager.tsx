import { useEffect, useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import { getPopups, addPopup, updatePopup, deletePopup } from '../../lib/firestore'
import { compressImage } from '../../utils/imageCompress'
import type { Popup } from '../../types'

interface Props {
  canWrite: boolean
  canDelete: boolean
}

const TYPE_LABELS: Record<Popup['type'], string> = {
  entry: '進版彈窗',
  floating: '拖動視窗',
  banner: '側欄廣告',
}

export default function PopupManager({ canWrite, canDelete }: Props) {
  const [popups, setPopups] = useState<Popup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 新增表單狀態
  const [type, setType] = useState<Popup['type']>('entry')
  const [text, setText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [position, setPosition] = useState<'left' | 'right'>('left')

  async function load() {
    try {
      setPopups(await getPopups())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!file && !text.trim()) {
      setError('至少需要圖片或文字內容')
      return
    }
    setSaving(true)
    setError('')
    try {
      let imageUrl: string | undefined
      if (file) {
        const blob = await compressImage(file)
        const storageRef = ref(storage, `popup-images/${Date.now()}.webp`)
        await uploadBytes(storageRef, blob, { contentType: 'image/webp' })
        imageUrl = await getDownloadURL(storageRef)
      }
      await addPopup({
        type,
        ...(type === 'banner' ? { position } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        ...(text.trim() ? { text: text.trim() } : {}),
        ...(linkUrl.trim() ? { linkUrl: linkUrl.trim() } : {}),
        enabled: true,
        order: popups.length,
      })
      setText(''); setLinkUrl(''); setFile(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增失敗')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(p: Popup) {
    await updatePopup(p.id, { enabled: !p.enabled })
    await load()
  }

  async function handleDelete(id: string) {
    await deletePopup(id)
    await load()
  }

  if (loading) return <p className="text-[var(--color-text-muted)] text-sm">載入中…</p>

  return (
    <div className="flex flex-col gap-6">
      {canWrite && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded p-4 flex flex-col gap-3">
          <h3 className="font-serif text-[var(--color-gold-primary)]">新增彈窗</h3>
          <div className="flex gap-3 flex-wrap items-center">
            <select value={type} onChange={e => setType(e.target.value as Popup['type'])}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)]">
              <option value="entry">進版彈窗</option>
              <option value="floating">拖動視窗</option>
              <option value="banner">側欄廣告</option>
            </select>
            {type === 'banner' && (
              <select value={position} onChange={e => setPosition(e.target.value as 'left' | 'right')}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)]">
                <option value="left">左側</option>
                <option value="right">右側</option>
              </select>
            )}
            <label className="cursor-pointer bg-[var(--color-gold-primary)] text-[var(--color-bg-primary)] text-sm font-semibold px-4 py-1.5 rounded hover:bg-[var(--color-gold-light)] transition-colors max-w-52 truncate inline-block">
              {file ? `已選擇: ${file.name}` : '選擇圖片'}
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="hidden" />
            </label>
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="文字內容(拖動視窗用；選填)"
            rows={2}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]" />
          <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="點擊連結(選填)"
            className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]" />
          <button onClick={handleAdd} disabled={saving}
            className="self-start bg-[var(--color-gold-primary)] text-[var(--color-bg-primary)] text-sm font-semibold px-6 py-1.5 rounded hover:bg-[var(--color-gold-light)] disabled:opacity-50 transition-colors">
            {saving ? '上傳中…' : '新增'}
          </button>
          {error && <p className="text-[var(--color-danger-text)] text-sm">{error}</p>}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {popups.length === 0 && <p className="text-[var(--color-text-muted)] text-sm">尚無彈窗</p>}
        {popups.map(p => (
          <li key={p.id} className="flex items-center gap-4 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded p-3">
            {p.imageUrl && <img src={p.imageUrl} alt="" className="w-16 h-16 object-cover rounded" />}
            <div className="flex-1 min-w-0">
              <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)]">
                {TYPE_LABELS[p.type]}{p.type === 'banner' && p.position ? `(${p.position === 'left' ? '左' : '右'})` : ''}
              </span>
              {p.text && <p className="text-sm text-[var(--color-text-primary)] truncate mt-1">{p.text}</p>}
              {p.linkUrl && <p className="text-xs text-[var(--color-text-muted)] truncate">{p.linkUrl}</p>}
            </div>
            {canWrite && (
              <button onClick={() => handleToggle(p)}
                className={`text-sm px-3 py-1 rounded-md font-medium transition-colors ${p.enabled ? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]' : 'bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)]'}`}>
                {p.enabled ? '啟用中' : '已停用'}
              </button>
            )}
            {canDelete && (
              <button onClick={() => handleDelete(p.id)}
                className="text-xs text-[var(--color-danger-border)] hover:text-[var(--color-danger-text)] p-1">✕</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
