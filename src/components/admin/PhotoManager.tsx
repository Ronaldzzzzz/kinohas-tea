// src/components/admin/PhotoManager.tsx
import { useEffect, useRef, useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import { getGlobalSettings, updateGlobalSettings } from '../../lib/firestore'
import { compressImage } from '../../utils/imageCompress'
import type { CropData, PhotoUrl } from '../../types'
import CropTool from './CropTool'

export default function PhotoManager() {
  const [photoUrls, setPhotoUrls] = useState<PhotoUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const settings = await getGlobalSettings()
      setPhotoUrls(settings.photoUrls ?? [])
    } catch {
      setError('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      const blob = await compressImage(file)
      const storageRef = ref(storage, `promotional-photos/${Date.now()}.webp`)
      await uploadBytes(storageRef, blob, { contentType: 'image/webp' })
      const url = await getDownloadURL(storageRef)
      const newEntry: PhotoUrl = { url }
      const newUrls = [...photoUrls, newEntry]
      await updateGlobalSettings({ photoUrls: newUrls })
      setPhotoUrls(newUrls)
    } catch {
      setError('上傳失敗，請重試')
    } finally {
      setUploading(false)
      // 清空 input 讓同一檔案可重複選取
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSaveCrop(cropData: CropData) {
    if (editingIndex === null) return
    setIsSaving(true)
    setError(null)
    const updated = photoUrls.map((p, i) =>
      i === editingIndex ? { ...p, cropData } : p
    )
    try {
      await updateGlobalSettings({ photoUrls: updated })
      setPhotoUrls(updated)
      setEditingIndex(null)
    } catch {
      setError('儲存裁剪失敗，請重試')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(urlToRemove: string) {
    if (!confirm('確定要移除此宣傳照？（Storage 中的檔案不會被刪除）')) return
    const newUrls = photoUrls.filter(u => u.url !== urlToRemove)
    try {
      await updateGlobalSettings({ photoUrls: newUrls })
      setPhotoUrls(newUrls)
    } catch {
      setError('刪除失敗，請重試')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 上傳區 */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded p-4 flex flex-col gap-3">
        <h3 className="text-[var(--color-gold-primary)] text-sm font-semibold tracking-wide">
          上傳宣傳照
        </h3>
        <p className="text-[var(--color-text-muted)] text-xs">
          照片將以輪播方式顯示於首頁主視覺 Hero 背景。
        </p>
        <div className="flex items-center gap-3">
          <label
            className={`
              cursor-pointer bg-[var(--color-gold-primary)] text-[var(--color-bg-primary)]
              text-xs font-semibold px-5 py-1.5 rounded
              hover:bg-[var(--color-gold-light)] transition-colors
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {uploading ? '上傳中…' : '選擇圖片'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          {uploading && (
            <span className="text-[var(--color-text-muted)] text-xs">正在上傳至 Firebase Storage…</span>
          )}
        </div>
        {error && (
          <p className="text-red-400 text-xs">{error}</p>
        )}
      </div>

      {/* 現有照片列表 */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded p-4">
        <h3 className="text-[var(--color-gold-primary)] text-sm font-semibold tracking-wide mb-3">
          現有宣傳照（共 {photoUrls.length} 張）
        </h3>

        {loading ? (
          <p className="text-[var(--color-text-muted)] text-sm text-center py-4">載入中…</p>
        ) : photoUrls.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-sm text-center py-4">尚無宣傳照</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photoUrls.map((entry, index) => (
              <div
                key={entry.url}
                className="relative group border border-[var(--color-border-primary)] rounded overflow-hidden bg-[var(--color-bg-primary)]"
              >
                <img
                  src={entry.url}
                  alt={`宣傳照 ${index + 1}`}
                  className="w-full object-cover"
                  style={{ height: '120px' }}
                />
                {/* 覆蓋層 - hover 顯示操作按鈕 */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleDelete(entry.url)}
                    className="text-xs text-white bg-red-600/80 hover:bg-red-600 rounded px-3 py-1 transition-colors"
                  >
                    移除
                  </button>
                  <button
                    onClick={() => setEditingIndex(index)}
                    className="text-xs rounded px-3 py-1 transition-colors"
                    style={{
                      border: '1px solid var(--color-gold-primary)',
                      color: 'var(--color-gold-primary)',
                      background: 'rgba(201,165,90,0.15)',
                    }}
                  >
                    裁剪
                  </button>
                </div>
                <div className="px-2 py-1 text-[10px] text-[var(--color-text-muted)] truncate">
                  照片 {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingIndex !== null && editingIndex < photoUrls.length && (
        <CropTool
          imageUrl={photoUrls[editingIndex].url}
          initialCropData={photoUrls[editingIndex].cropData}
          onSave={handleSaveCrop}
          onCancel={() => setEditingIndex(null)}
          isSaving={isSaving}
          errorMessage={error}
        />
      )}
    </div>
  )
}
