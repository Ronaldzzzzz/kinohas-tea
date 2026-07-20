import { useState, useEffect, useRef } from 'react'
import type { Order, AdminSession } from '../../types'
import { subscribeOrders, deleteOrder, completeOrder, deleteOrderAndRestoreStock } from '../../lib/firestore'
import { ACTIVE_ORDER_WINDOW_MS } from '../../lib/constants'
import { useToast } from '../../hooks/useToast'
import Toast from '../Toast'

interface Props {
  session: AdminSession
  realModeEnabled: boolean
  canWrite: boolean
  canDelete: boolean
}

const HISTORY_PAGE_SIZE = 10

export default function OrderManager({ session, realModeEnabled, canWrite, canDelete }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [historyPage, setHistoryPage] = useState(0)
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set())
  const [batchDeleting, setBatchDeleting] = useState(false)
  const { toast, showToast } = useToast()
  const knownIds = useRef<Set<string> | null>(null) // null = 尚未收到第一批資料，用來略過初次載入的提示音

  function playNewOrderPing() {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
      osc.onended = () => ctx.close()
    } catch {
      /* 瀏覽器不支援或被阻擋，忽略即可 */
    }
  }

  useEffect(() => {
    setLoading(true)
    setError(null)
    const unsubscribe = subscribeOrders(
      (data) => {
        setOrders(data)
        setLoading(false)

        if (knownIds.current !== null) {
          const newPending = data.filter(
            o => (o.status ?? 'pending') === 'pending' && !knownIds.current!.has(o.id)
          )
          if (newPending.length > 0) {
            showToast(`收到 ${newPending.length} 筆新訂單！`, 'success')
            playNewOrderPing()
          }
        }
        knownIds.current = new Set(data.map(o => o.id))
      },
      (err) => {
        console.error('訂閱訂單失敗:', err)
        setError('即時更新中斷，請重新整理頁面。')
        setLoading(false)
      }
    )
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleComplete(id: string) {
    setCompleting(id)
    try {
      await completeOrder(id, session.label)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'completed' as const, completedBy: session.label } : o))
    } catch (err) {
      console.error('完成訂單失敗:', err)
      showToast('操作失敗，請稍後再試。', 'error')
    } finally {
      setCompleting(null)
    }
  }

  async function handleDelete(order: Order) {
    if (!confirm('確定刪除此筆訂單？')) return
    setDeleting(order.id)
    try {
      if (realModeEnabled && (order.status ?? 'pending') === 'pending') {
        await deleteOrderAndRestoreStock(order)
      } else {
        await deleteOrder(order.id)
      }
      setOrders(prev => prev.filter(o => o.id !== order.id))
    } catch (err) {
      console.error('刪除訂單失敗:', err)
      showToast('刪除失敗，請稍後再試。', 'error')
    } finally {
      setDeleting(null)
    }
  }

  async function handleBatchDeleteHistory() {
    if (selectedHistoryIds.size === 0) return
    if (!confirm(`確定刪除選取的 ${selectedHistoryIds.size} 筆歷史訂單？`)) return
    setBatchDeleting(true)
    try {
      await Promise.all(Array.from(selectedHistoryIds).map(id => deleteOrder(id)))
      setOrders(prev => prev.filter(o => !selectedHistoryIds.has(o.id)))
      setSelectedHistoryIds(new Set())
    } catch (err) {
      console.error('批量刪除失敗:', err)
      showToast('部分刪除失敗，請重新整理後確認。', 'error')
    } finally {
      setBatchDeleting(false)
    }
  }

  function toggleHistorySelect(id: string) {
    setSelectedHistoryIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllHistory() {
    if (selectedHistoryIds.size === pagedHistory.length) {
      setSelectedHistoryIds(new Set())
    } else {
      setSelectedHistoryIds(new Set(pagedHistory.map(o => o.id)))
    }
  }

  function formatTime(order: Order): string {
    try {
      const date = order.timestamp?.toDate?.()
      if (!date) return '—'
      return date.toLocaleString('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return '—'
    }
  }

  const now = Date.now()
  const activeOrders = orders.filter(o => {
    const t = o.timestamp?.toDate?.()?.getTime?.() ?? now
    return (now - t) < ACTIVE_ORDER_WINDOW_MS
  })
  const historicalOrders = orders.filter(o => {
    const t = o.timestamp?.toDate?.()?.getTime?.() ?? now
    return (now - t) >= ACTIVE_ORDER_WINDOW_MS
  })
  const totalHistoryPages = Math.ceil(historicalOrders.length / HISTORY_PAGE_SIZE)
  const pagedHistory = historicalOrders.slice(
    historyPage * HISTORY_PAGE_SIZE,
    (historyPage + 1) * HISTORY_PAGE_SIZE
  )

  return (
    <div className="flex flex-col gap-4">
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <h3 className="text-[var(--color-gold-primary)] font-serif tracking-widest text-lg">點餐管理</h3>
        <span className="text-xs text-[var(--color-success-text)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success-text)] animate-pulse" />
          即時更新中
        </span>
      </div>

      {error && (
        <p className="text-[var(--color-danger-text)] text-sm text-center py-2 border border-[var(--color-danger-border)] rounded bg-[var(--color-danger-bg)] px-3">
          {error}
        </p>
      )}

      {/* Tab 切換 */}
      <div className="flex gap-2">
        {(['active', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setHistoryPage(0); setSelectedHistoryIds(new Set()) }}
            className={`px-4 py-1.5 text-sm rounded transition-colors ${
              tab === t
                ? 'bg-[var(--color-gold-primary)] text-[var(--color-bg-card)] font-semibold'
                : 'bg-[var(--color-bg-card-hover)] border border-[var(--color-border-gold)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {t === 'active'
              ? `當前訂單 (${activeOrders.length})`
              : `歷史訂單 (${historicalOrders.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[var(--color-text-muted)] text-sm text-center py-8">載入中…</p>
      ) : tab === 'active' ? (
        /* ── 當前訂單 ── */
        activeOrders.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-sm text-center py-8">目前無訂單</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {activeOrders.map(order => {
              const isCompleted = order.status === 'completed'
              return (
                <li
                  key={order.id}
                  className={`border rounded p-4 flex flex-col gap-2 ${
                    isCompleted
                      ? 'bg-[var(--color-success-bg)] border-[var(--color-success-border)]'
                      : 'bg-[var(--color-bg-card-hover)] border-[var(--color-border-gold)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--color-text-primary)] text-base font-semibold">{order.customerName}</span>
                        {isCompleted && (
                          <span className="text-xs text-[var(--color-success-text)] border border-[var(--color-success-border)] rounded px-1.5 py-0.5">
                            已完成{order.completedBy ? ` · ${order.completedBy}` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-[var(--color-text-muted)]">{formatTime(order)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isCompleted && canWrite && (
                        <button
                          onClick={() => handleComplete(order.id)}
                          disabled={completing === order.id}
                          className="text-sm text-[var(--color-success-text)] border border-[var(--color-success-border)] hover:bg-[var(--color-success-bg)] px-3 py-1 rounded transition-colors disabled:opacity-50"
                        >
                          {completing === order.id ? '處理中…' : '完成'}
                        </button>
                      )}
                      {!isCompleted && canDelete && (
                        <button
                          onClick={() => handleDelete(order)}
                          disabled={deleting === order.id}
                          className="text-sm text-[var(--color-danger-border)] hover:text-[var(--color-danger-text)] transition-colors border border-[var(--color-danger-bg)] hover:border-[var(--color-danger-border)] px-3 py-1 rounded disabled:opacity-50"
                        >
                          {deleting === order.id ? '刪除中…' : '刪除'}
                        </button>
                      )}
                    </div>
                  </div>
                  <ul className="flex flex-col gap-0.5 pl-2 border-l border-[var(--color-border-gold)]">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="text-sm text-[var(--color-text-muted)]">
                        ✦ {item.menuItemName}
                        {item.quantity > 1 && <span className="text-[var(--color-text-muted)]"> × {item.quantity}</span>}
                      </li>
                    ))}
                  </ul>
                  {order.note && (
                    <p className="text-sm text-[var(--color-text-muted)] italic mt-0.5">備註：{order.note}</p>
                  )}
                </li>
              )
            })}
          </ul>
        )
      ) : (
        /* ── 歷史訂單 ── */
        <div className="flex flex-col gap-3">
          {historicalOrders.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-sm text-center py-8">無歷史訂單</p>
          ) : (
            <>
              {/* 批量操作列 */}
              <div className="flex items-center gap-3">
                {canDelete && (
                  <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedHistoryIds.size === pagedHistory.length && pagedHistory.length > 0}
                      onChange={toggleSelectAllHistory}
                      className="accent-[var(--color-gold-primary)]"
                    />
                    全選本頁
                  </label>
                )}
                {canDelete && selectedHistoryIds.size > 0 && (
                  <button
                    onClick={handleBatchDeleteHistory}
                    disabled={batchDeleting}
                    className="text-sm text-[var(--color-danger-text)] border border-[var(--color-danger-border)] hover:bg-[var(--color-danger-bg)] px-3 py-1 rounded transition-colors disabled:opacity-50"
                  >
                    {batchDeleting ? '刪除中…' : `刪除選取 (${selectedHistoryIds.size})`}
                  </button>
                )}
              </div>

              {/* 歷史訂單列表 */}
              <ul className="flex flex-col gap-3">
                {pagedHistory.map(order => (
                  <li
                    key={order.id}
                    className="bg-[var(--color-bg-card-hover)] border border-[var(--color-border-primary)] rounded p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedHistoryIds.has(order.id)}
                        onChange={() => toggleHistorySelect(order.id)}
                        className="accent-[var(--color-gold-primary)] mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-text-primary)] text-base font-semibold">{order.customerName}</span>
                          {order.status === 'completed' && (
                            <span className="text-xs text-[var(--color-success-text)] border border-[var(--color-success-border)] rounded px-1.5 py-0.5">
                              已完成{order.completedBy ? ` · ${order.completedBy}` : ''}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-[var(--color-text-muted)]">{formatTime(order)}</span>
                        <ul className="flex flex-col gap-0.5 pl-2 border-l border-[var(--color-border-primary)] mt-1">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="text-sm text-[var(--color-text-muted)]">
                              ✦ {item.menuItemName}
                              {item.quantity > 1 && <span className="text-[var(--color-text-muted)]"> × {item.quantity}</span>}
                            </li>
                          ))}
                        </ul>
                        {order.note && (
                          <p className="text-sm text-[var(--color-text-muted)] italic mt-0.5">備註：{order.note}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* 分頁控制 */}
              {totalHistoryPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => { setHistoryPage(p => Math.max(0, p - 1)); setSelectedHistoryIds(new Set()) }}
                    disabled={historyPage === 0}
                    className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-40 px-2"
                  >
                    ← 上頁
                  </button>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {historyPage + 1} / {totalHistoryPages}
                  </span>
                  <button
                    onClick={() => { setHistoryPage(p => Math.min(totalHistoryPages - 1, p + 1)); setSelectedHistoryIds(new Set()) }}
                    disabled={historyPage >= totalHistoryPages - 1}
                    className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-40 px-2"
                  >
                    下頁 →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      <Toast toast={toast} />
    </div>
  )
}
