import { useEffect, useState } from 'react'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import { deleteField } from 'firebase/firestore'
import { getPopups, addPopup, updatePopup, deletePopup, getGlobalSettings, updateGlobalSettings } from '../../lib/firestore'
import { compressImage } from '../../utils/imageCompress'
import type { Popup } from '../../types'

interface Props {
  canWrite: boolean
  canDelete: boolean
}

const TYPE_ORDER: Popup['type'][] = ['entry', 'floating', 'banner']

const TYPE_LABELS: Record<Popup['type'], string> = {
  entry: '進版彈窗',
  floating: '拖動視窗',
  banner: '側欄廣告',
}

interface EditForm {
  type: Popup['type']
  text: string
  linkUrl: string
  position: 'left' | 'right'
  file: File | null
}

function toEditForm(p: Popup): EditForm {
  return { type: p.type, text: p.text ?? '', linkUrl: p.linkUrl ?? '', position: p.position ?? 'left', file: null }
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

  // 進版彈窗同時顯示數量設定
  const [entryPopupCount, setEntryPopupCount] = useState(1)
  const [entryPopupCountInput, setEntryPopupCountInput] = useState('1')
  const [countSaving, setCountSaving] = useState(false)
  const [countSaved, setCountSaved] = useState(false)
  const [hasLoadedCount, setHasLoadedCount] = useState(false)

  // 編輯現有彈窗
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ type: 'entry', text: '', linkUrl: '', position: 'left', file: null })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  async function load() {
    try {
      setPopups(await getPopups())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    getGlobalSettings().then(s => {
      const v = s.entryPopupCount ?? 1
      setEntryPopupCount(v)
      setEntryPopupCountInput(String(v))
      setHasLoadedCount(true)
    }).catch(() => {})
  }, [])

  async function handleSaveCount() {
    if (!hasLoadedCount || countSaving) return
    setCountSaving(true)
    try {
      await updateGlobalSettings({ entryPopupCount })
      setCountSaved(true)
      setTimeout(() => setCountSaved(false), 2000)
    } finally {
      setCountSaving(false)
    }
  }

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

  async function handleDelete(popup: Popup) {
    await deletePopup(popup.id)
    if (popup.imageUrl) {
      try {
        await deleteObject(ref(storage, popup.imageUrl))
      } catch {
        /* 檔案可能已不存在，忽略 */
      }
    }
    await load()
  }

  function startEdit(p: Popup) {
    setEditingId(p.id)
    setEditForm(toEditForm(p))
    setEditError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError('')
  }

  async function handleSaveEdit(popup: Popup) {
    if (!editForm.file && !editForm.text.trim() && !popup.imageUrl) {
      setEditError('至少需要圖片或文字內容')
      return
    }
    setEditSaving(true)
    setEditError('')
    try {
      let imageUrl = popup.imageUrl
      if (editForm.file) {
        const blob = await compressImage(editForm.file)
        const storageRef = ref(storage, `popup-images/${Date.now()}.webp`)
        await uploadBytes(storageRef, blob, { contentType: 'image/webp' })
        imageUrl = await getDownloadURL(storageRef)
        // 換圖成功後才清舊檔，避免上傳失敗時舊圖也被清掉
        if (popup.imageUrl) {
          try {
            await deleteObject(ref(storage, popup.imageUrl))
          } catch {
            /* 檔案可能已不存在，忽略 */
          }
        }
      }
      await updatePopup(popup.id, {
        type: editForm.type,
        position: editForm.type === 'banner' ? editForm.position : deleteField(),
        text: editForm.text.trim(),
        linkUrl: editForm.linkUrl.trim(),
        ...(imageUrl ? { imageUrl } : {}),
      })
      setEditingId(null)
      await load()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) return <p className="text-[var(--color-text-muted)] text-sm">載入中…</p>

  const grouped = TYPE_ORDER.map(t => ({ type: t, items: popups.filter(p => p.type === t) })).filter(g => g.items.length > 0)

  return (
    <div className="flex flex-col gap-6">
      {canWrite && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded p-4 flex flex-col gap-2">
          <h3 className="font-serif text-[var(--color-gold-primary)]">進版彈窗同時顯示數量</h3>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={-1}
              max={6}
              value={entryPopupCountInput}
              onChange={e => {
                const raw = e.target.value
                setEntryPopupCountInput(raw)
                if (raw === '' || raw === '-') return // 允許輸入到一半（空字串或負號）
                const parsed = parseInt(raw)
                if (Number.isNaN(parsed)) return
                setEntryPopupCount(Math.max(-1, Math.min(6, parsed)))
              }}
              onBlur={() => setEntryPopupCountInput(String(entryPopupCount))}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] rounded px-3 py-1.5 text-sm w-24
                         focus:outline-none focus:border-[var(--color-gold-primary)] transition-colors"
            />
            <span className="text-[var(--color-text-muted)] text-xs">-1 ~ 6</span>
            <button onClick={handleSaveCount} disabled={countSaving || !hasLoadedCount}
              className="text-sm px-4 py-1.5 rounded border border-[var(--color-gold-primary)] text-[var(--color-gold-primary)] hover:bg-[var(--color-gold-primary)] hover:text-[var(--color-bg-primary)] disabled:opacity-50 transition-colors">
              {countSaving ? '儲存中…' : '儲存'}
            </button>
            {countSaved && <span className="text-[var(--color-success-text)] text-xs">✓ 已儲存</span>}
          </div>
          <p className="text-[var(--color-text-muted)] text-[11px]">
            -1 = 全部進版彈窗同時顯示(隨機不重疊)；0 = 不顯示；1-6 = 固定排列,實際啟用數少於此值時改用實際數量的排列。
          </p>
        </div>
      )}

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

      {popups.length === 0 && <p className="text-[var(--color-text-muted)] text-sm">尚無彈窗</p>}

      {grouped.map(group => (
        <div key={group.type} className="flex flex-col gap-3">
          <h3 className="font-serif text-sm text-[var(--color-gold-primary)] tracking-wide">
            {TYPE_LABELS[group.type]}({group.items.length})
          </h3>
          <ul className="flex flex-col gap-3">
            {group.items.map(p => (
              <li key={p.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded p-3">
                {editingId === p.id ? (
                  <div className="flex flex-col gap-2">
                    <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value as Popup['type'] }))}
                      className="self-start bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)]">
                      <option value="entry">進版彈窗</option>
                      <option value="floating">拖動視窗</option>
                      <option value="banner">側欄廣告</option>
                    </select>
                    {editForm.type === 'banner' && (
                      <select value={editForm.position} onChange={e => setEditForm(f => ({ ...f, position: e.target.value as 'left' | 'right' }))}
                        className="self-start bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)]">
                        <option value="left">左側</option>
                        <option value="right">右側</option>
                      </select>
                    )}
                    <textarea value={editForm.text} onChange={e => setEditForm(f => ({ ...f, text: e.target.value }))}
                      placeholder="文字內容" rows={2}
                      className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]" />
                    <input value={editForm.linkUrl} onChange={e => setEditForm(f => ({ ...f, linkUrl: e.target.value }))}
                      placeholder="點擊連結(選填)"
                      className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]" />
                    <div className="flex items-center gap-3">
                      {p.imageUrl && !editForm.file && <img src={p.imageUrl} alt="" className="w-12 h-12 object-cover rounded" />}
                      <label className="cursor-pointer bg-[var(--color-bg-card-hover)] border border-[var(--color-border-gold)] text-[var(--color-text-primary)] text-sm px-4 py-1.5 rounded hover:border-[var(--color-gold-primary)] transition-colors max-w-52 truncate inline-block">
                        {editForm.file ? `已選擇: ${editForm.file.name}` : '更換圖片(選填)'}
                        <input type="file" accept="image/*" onChange={e => setEditForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))}
                          className="hidden" />
                      </label>
                    </div>
                    {editError && <p className="text-[var(--color-danger-text)] text-sm">{editError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(p)} disabled={editSaving}
                        className="bg-[var(--color-gold-primary)] text-[var(--color-bg-primary)] text-sm font-semibold px-5 py-1.5 rounded hover:bg-[var(--color-gold-light)] disabled:opacity-50 transition-colors">
                        {editSaving ? '儲存中…' : '儲存'}
                      </button>
                      <button onClick={cancelEdit} disabled={editSaving}
                        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] px-3 py-1.5">
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    {p.imageUrl && <img src={p.imageUrl} alt="" className="w-16 h-16 object-cover rounded" />}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)]">
                        {p.type === 'banner' && p.position ? (p.position === 'left' ? '左側' : '右側') : TYPE_LABELS[p.type]}
                      </span>
                      {p.text && <p className="text-sm text-[var(--color-text-primary)] truncate mt-1">{p.text}</p>}
                      {p.linkUrl && <p className="text-xs text-[var(--color-text-muted)] truncate">{p.linkUrl}</p>}
                    </div>
                    {canWrite && (
                      <button onClick={() => startEdit(p)}
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1">編輯</button>
                    )}
                    {canWrite && (
                      <button onClick={() => handleToggle(p)}
                        className={`text-sm px-3 py-1 rounded-md font-medium transition-colors ${p.enabled ? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]' : 'bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)]'}`}>
                        {p.enabled ? '啟用中' : '已停用'}
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(p)}
                        className="text-xs text-[var(--color-danger-border)] hover:text-[var(--color-danger-text)] p-1">✕</button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
