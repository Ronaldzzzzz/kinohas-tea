import { useState, useEffect, useCallback } from 'react'
import type { MenuItem } from '../types'
import { addOrder, addOrderWithStockDeduction, getGlobalSettings, subscribeGlobalSettings } from '../lib/firestore'
import { isOutOfStock, getStockLevel } from '../lib/constants'

const STOCK_BADGE: Record<'high' | 'mid' | 'low', { label: string; className: string }> = {
  high: { label: '庫存充足', className: 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]' },
  mid: { label: '尚有庫存', className: 'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]' },
  low: { label: '', className: 'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]' },
}

const LS_KEY = 'lastOrderTime'

interface OrderFormProps {
  menuItems: MenuItem[]
}

export default function OrderForm({ menuItems }: OrderFormProps) {
  const [cooldownMinutes, setCooldownMinutes] = useState(30)
  const [customerName, setCustomerName] = useState('')
  const [selected, setSelected] = useState<Map<string, number>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [realModeEnabled, setRealModeEnabled] = useState(false)
  const [businessOpen, setBusinessOpen] = useState(true)

  // 計算剩餘冷卻時間（毫秒）
  const calcRemaining = useCallback((cooldownMs: number): number => {
    const last = localStorage.getItem(LS_KEY)
    if (!last) return 0
    const elapsed = Date.now() - parseInt(last, 10)
    return Math.max(0, cooldownMs - elapsed)
  }, [])

  // 載入設定
  useEffect(() => {
    getGlobalSettings()
      .then(settings => {
        setCooldownMinutes(settings.orderCooldownMinutes)
        setRemainingMs(calcRemaining(settings.orderCooldownMinutes * 60 * 1000))
        setRealModeEnabled(settings.realModeEnabled ?? false)
      })
      .catch(err => {
        console.error('無法載入點餐設定:', err)
        // orderCooldownMinutes 已有預設值 30，fallback 到預設即可
      })
      .finally(() => setLoadingSettings(false))
  }, [calcRemaining])

  // 訂閱營業狀態，後台切換休息中時即時停用點餐介面
  useEffect(() => {
    return subscribeGlobalSettings(settings => setBusinessOpen(settings.businessOpen ?? true))
  }, [])

  // 每秒更新倒數
  useEffect(() => {
    if (remainingMs <= 0) return
    const timer = setInterval(() => {
      const cooldownMs = cooldownMinutes * 60 * 1000
      const r = calcRemaining(cooldownMs)
      setRemainingMs(r)
      if (r <= 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [remainingMs, cooldownMinutes, calcRemaining])

  // 單一品項可購買上限：優先受庫存限制（開啟真實模式且非無限量時），再受管理員設定的最大購買數量限制
  function maxQtyFor(item: MenuItem): number {
    const limits: number[] = []
    if (item.maxOrderQty && item.maxOrderQty > 0) limits.push(item.maxOrderQty)
    if (realModeEnabled && !item.unlimited) limits.push(item.stock ?? 0)
    return limits.length > 0 ? Math.max(1, Math.min(...limits)) : 99
  }

  function toggleItem(id: string) {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(id)) next.delete(id)
      else next.set(id, 1)
      return next
    })
  }

  function setQuantity(item: MenuItem, qty: number) {
    setSelected(prev => {
      const next = new Map(prev)
      next.set(item.id, Math.max(1, Math.min(maxQtyFor(item), qty || 1)))
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (remainingMs > 0 || submitting || !businessOpen) return
    if (!customerName.trim() || selected.size === 0) return

    setSubmitError(null)
    setSubmitting(true)
    try {
      const items = Array.from(selected.entries()).map(([id, quantity]) => {
        const item = menuItems.find(m => m.id === id)!
        return { menuItemId: id, menuItemName: item.name, quantity }
      })
      const orderData = { customerName: customerName.trim(), items }
      if (realModeEnabled) {
        await addOrderWithStockDeduction(orderData)
      } else {
        await addOrder(orderData)
      }
      localStorage.setItem(LS_KEY, Date.now().toString())
      setCustomerName('')
      setSelected(new Map())
      setSuccess(true)
      setRemainingMs(cooldownMinutes * 60 * 1000)
      setTimeout(() => setSuccess(false), 4000)
    } catch {
      setSubmitError('送出失敗，請稍後再試。')
    } finally {
      setSubmitting(false)
    }
  }

  const remainingMin = Math.ceil(remainingMs / 60000)
  const inCooldown = remainingMs > 0

  return (
    <section className="mt-6 sm:mt-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[var(--color-gold-primary)] font-serif text-xl sm:text-2xl tracking-widest">✦ 點餐</h2>
        <div className="flex-1 h-px bg-[var(--color-border-gold)] opacity-60" />
      </div>

      <form
        onSubmit={handleSubmit}
        className={`bg-[var(--color-bg-card-hover)] border border-[var(--color-border-gold)] rounded p-3 sm:p-5 flex flex-col gap-3 sm:gap-4 transition-[filter,opacity] ${
          !businessOpen ? 'grayscale opacity-60' : ''
        }`}
      >
        {!businessOpen && (
          <p className="text-[var(--color-text-muted)] text-sm text-center py-1 tracking-wide">
            🌙 目前休息中，暫停接受點餐
          </p>
        )}

        <fieldset disabled={!businessOpen} className="contents">
        {/* 客人名稱 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--color-text-muted)] tracking-wide">角色 ID（必填）</label>
          <input
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="輸入你的角色 ID…"
            required
            className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-gold-primary)] disabled:cursor-not-allowed"
          />
        </div>

        {/* 菜單勾選 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--color-text-muted)] tracking-wide">選擇品項（至少一項）</label>
          {loadingSettings ? (
            <p className="text-[var(--color-text-muted)] text-sm py-2">載入設定中…</p>
          ) : menuItems.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-sm py-2">目前無可點餐品項</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
              {menuItems.map(item => {
                const outOfStock = isOutOfStock(item, realModeEnabled)
                return (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                      outOfStock
                        ? 'bg-[var(--color-bg-card-hover)] border border-[var(--color-border-primary)] opacity-50 cursor-not-allowed'
                        : selected.has(item.id)
                          ? 'bg-[var(--color-bg-card-hover)] border border-[var(--color-gold-primary)] cursor-pointer'
                          : 'bg-[var(--color-bg-card-hover)] border border-[var(--color-border-primary)] hover:border-[var(--color-text-muted)] cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => !outOfStock && toggleItem(item.id)}
                      disabled={outOfStock}
                      className="accent-[var(--color-gold-primary)]"
                    />
                    <span className={`flex-1 text-sm ${outOfStock ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>
                      {item.alias || item.name}
                    </span>
                    {selected.has(item.id) && !outOfStock && (
                      <input
                        type="number"
                        min={1}
                        max={maxQtyFor(item)}
                        value={selected.get(item.id)}
                        onClick={e => e.preventDefault()}
                        onChange={e => setQuantity(item, parseInt(e.target.value))}
                        className="w-14 bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded px-2 py-0.5 text-xs text-[var(--color-text-primary)] text-center focus:outline-none focus:border-[var(--color-gold-primary)]"
                      />
                    )}
                    {outOfStock ? (
                      <span className="text-xs text-[var(--color-danger-text)] border border-[var(--color-danger-border)] rounded px-1.5 py-0.5">
                        缺貨
                      </span>
                    ) : (
                      <>
                        {realModeEnabled && !item.unlimited && item.stock != null && (() => {
                          const level = getStockLevel(item.stock)
                          const badge = STOCK_BADGE[level]
                          return (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${badge.className}`}>
                              {level === 'low' ? `庫存 ${item.stock}` : badge.label}
                            </span>
                          )
                        })()}
                        <span className="text-xs text-[var(--color-text-muted)]">{item.price} gil</span>
                      </>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* 錯誤提示 */}
        {submitError && (
          <p className="text-[var(--color-danger-text)] text-sm text-center mt-2">{submitError}</p>
        )}

        {/* 成功提示 */}
        {success && (
          <p className="text-[var(--color-success-text)] text-sm text-center py-1">
            ✓ 點餐成功！感謝光顧 ✦
          </p>
        )}

        {/* 冷卻提示 */}
        {inCooldown && (
          <p className="text-[var(--color-gold-primary)] text-xs text-center">
            冷卻中，請稍候再送出下一筆訂單。
          </p>
        )}

        {/* 送出按鈕 */}
        <button
          type="submit"
          disabled={submitting || inCooldown || !customerName.trim() || selected.size === 0}
          className="self-end bg-[var(--color-gold-primary)] text-[var(--color-bg-card)] text-sm font-semibold px-6 py-1.5 rounded hover:bg-[var(--color-gold-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting
            ? '送出中…'
            : inCooldown
              ? `冷卻中 (剩 ${remainingMin} 分鐘)`
              : '送出點餐'}
        </button>
        </fieldset>
      </form>
    </section>
  )
}
