import { useEffect, useMemo, useState } from 'react'
import type { Order } from '../../types'
import { subscribeOrders } from '../../lib/firestore'

const TOP_N = 3

interface Ranked {
  menuItemId: string
  name: string
  quantity: number
}

/** 週一 00:00 為本週起點 */
function startOfWeek(now: Date): number {
  const d = new Date(now)
  const day = d.getDay() // 0=日 1=一 ... 6=六
  const diffToMonday = day === 0 ? 6 : day - 1
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - diffToMonday)
  return d.getTime()
}

function startOfMonth(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}

function formatMD(ms: number): string {
  const d = new Date(ms)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 標題容易只差一兩個字被看錯，附上實際日期區間讓使用者一眼確認 */
function dateRangeLabel(sinceMs: number, untilMs: number): string {
  const end = untilMs === Infinity ? new Date() : new Date(untilMs - 1)
  return `${formatMD(sinceMs)} - ${formatMD(end.getTime())}`
}

function rankTopItems(orders: Order[], sinceMs: number, untilMs: number): Ranked[] {
  const qtyByItem = new Map<string, Ranked>()
  for (const order of orders) {
    const t = order.timestamp?.toDate?.()?.getTime?.()
    if (t === undefined || t < sinceMs || t >= untilMs) continue
    for (const item of order.items) {
      const existing = qtyByItem.get(item.menuItemId)
      if (existing) {
        existing.quantity += item.quantity
      } else {
        qtyByItem.set(item.menuItemId, { menuItemId: item.menuItemId, name: item.menuItemName, quantity: item.quantity })
      }
    }
  }
  return Array.from(qtyByItem.values()).sort((a, b) => b.quantity - a.quantity).slice(0, TOP_N)
}

interface RankListProps {
  title: string
  items: Ranked[]
  range: string
  /** 本週/本月 = 當期(金色強調)；上週/上月 = 已結束區間(灰色) */
  isCurrent: boolean
}

function RankList({ title, items, range, isCurrent }: RankListProps) {
  return (
    <div
      className={`flex-1 min-w-0 bg-[var(--color-bg-card-hover)] border-l-4 border-y border-r border-[var(--color-border-primary)] rounded p-2 ${
        isCurrent ? 'border-l-[var(--color-gold-primary)]' : 'border-l-[var(--color-text-muted)]'
      }`}
    >
      <div className="flex items-baseline gap-1.5 mb-1">
        <h4 className={`text-[11px] tracking-widest ${isCurrent ? 'text-[var(--color-gold-primary)]' : 'text-[var(--color-text-muted)]'}`}>{title}</h4>
        <span className="text-[10px] text-[var(--color-text-muted)]">{range}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[var(--color-text-muted)] text-xs py-0.5">尚無資料</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {items.map((item, idx) => (
            <li key={item.menuItemId} className="flex items-center gap-1.5 text-xs">
              <span className={`w-3.5 text-center font-bold ${idx === 0 ? 'text-[var(--color-gold-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                {idx + 1}
              </span>
              <span className="flex-1 min-w-0 truncate text-[var(--color-text-primary)]">{item.name}</span>
              <span className="text-[var(--color-text-muted)]">{item.quantity} 份</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function SalesStats() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => subscribeOrders(
    (data) => { setOrders(data); setLoading(false) },
    () => setLoading(false)
  ), [])

  const periods = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now)
    const lastWeekStart = weekStart - 7 * 24 * 60 * 60 * 1000

    const monthStart = startOfMonth(now)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()

    return [
      { key: 'thisWeek', title: '本週熱銷', isCurrent: true, since: weekStart, until: Infinity },
      { key: 'lastWeek', title: '上週熱銷', isCurrent: false, since: lastWeekStart, until: weekStart },
      { key: 'thisMonth', title: '本月熱銷', isCurrent: true, since: monthStart, until: Infinity },
      { key: 'lastMonth', title: '上個月熱銷', isCurrent: false, since: lastMonthStart, until: monthStart },
    ].map(p => ({
      ...p,
      items: rankTopItems(orders, p.since, p.until),
      range: dateRangeLabel(p.since, p.until),
    }))
  }, [orders])

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded p-3 mb-4">
      <h3 className="text-[var(--color-gold-primary)] text-xs font-semibold mb-2">📊 銷量統計</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
        {loading ? (
          <p className="text-[var(--color-text-muted)] text-xs py-1">載入中…</p>
        ) : (
          periods.map(p => (
            <RankList key={p.key} title={p.title} items={p.items} range={p.range} isCurrent={p.isCurrent} />
          ))
        )}
      </div>
    </div>
  )
}
