// src/components/admin/GlobalSettingsManager.tsx
import { useEffect, useState } from 'react'
import { getGlobalSettings, updateGlobalSettings } from '../../lib/firestore'
import PhotoManager from './PhotoManager'

export default function GlobalSettingsManager() {
  const [address, setAddress] = useState('')
  const [cooldown, setCooldown] = useState(30)
  const [realModeEnabled, setRealModeEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false)

  useEffect(() => {
    getGlobalSettings()
      .then(s => {
        setAddress(s.address ?? '')
        setCooldown(s.orderCooldownMinutes ?? 30)
        setRealModeEnabled(s.realModeEnabled ?? false)
        setHasLoadedSettings(true)
      })
      .catch(() => setError('載入設定失敗'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!hasLoadedSettings || saving) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updateGlobalSettings({ address, orderCooldownMinutes: cooldown, realModeEnabled })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('儲存失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-[var(--color-text-muted)] text-sm text-center py-8">載入中…</p>
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 基本設定區塊 */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded p-5 flex flex-col gap-5">
        <h3 className="text-[var(--color-gold-primary)] text-sm font-semibold tracking-wide">
          基本設定
        </h3>

        {/* 餐廳地址 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[var(--color-text-muted)] text-xs tracking-wide">
            餐廳地址
          </label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="例：台北市信義區"
            className="bg-[#2d1e12] border border-[#8b6b4a] text-[#e8d5b5] rounded px-3 py-2 text-sm
                       placeholder:text-[#6a5030] focus:outline-none focus:border-[var(--color-gold-primary)]
                       transition-colors"
          />
          <p className="text-[#6a5030] text-[11px]">顯示於網站頁首導覽列。留空則不顯示。</p>
        </div>

        {/* 點餐冷卻時間 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[var(--color-text-muted)] text-xs tracking-wide">
            點餐冷卻時間（分鐘）
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={60}
              value={cooldown}
              onChange={e => setCooldown(Math.max(0, parseInt(e.target.value) || 0))}
              className="bg-[#2d1e12] border border-[#8b6b4a] text-[#e8d5b5] rounded px-3 py-2 text-sm w-28
                         focus:outline-none focus:border-[var(--color-gold-primary)] transition-colors"
            />
            <span className="text-[var(--color-text-muted)] text-xs">分鐘（0 = 無冷卻）</span>
          </div>
          <p className="text-[#6a5030] text-[11px]">同一客人在此時間內只能點一次餐。</p>
        </div>

        {/* 庫存模式開關 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[var(--color-text-muted)] text-xs tracking-wide">
            庫存模式
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRealModeEnabled(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                realModeEnabled ? 'bg-[#c9a55a]' : 'bg-[#4a3820]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  realModeEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-[var(--color-text-muted)] text-xs">
              {realModeEnabled ? '真實模式（訂單自動扣菜品庫存）' : '簡易模式（不連動庫存）'}
            </span>
          </div>
          <p className="text-[#6a5030] text-[11px]">
            真實模式啟用時，客人下單會扣除菜品庫存；刪除未完成訂單會退還庫存。
          </p>
        </div>

        {/* 儲存按鈕 */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !hasLoadedSettings}
            className={`px-5 py-1.5 text-sm rounded border transition-colors
                         border-[var(--color-gold-primary)] text-[var(--color-gold-primary)]
                         hover:bg-[var(--color-gold-primary)] hover:text-[var(--color-bg-primary)]
                        disabled:opacity-50 disabled:cursor-not-allowed font-semibold`}
          >
            {saving ? '儲存中…' : '儲存設定'}
          </button>
          {saved && (
            <span className="text-green-400 text-xs">✓ 已儲存</span>
          )}
          {error && (
            <span className="text-red-400 text-xs">{error}</span>
          )}
        </div>
      </div>

      {/* 宣傳照管理（直接嵌入 PhotoManager） */}
      <PhotoManager />
    </div>
  )
}
