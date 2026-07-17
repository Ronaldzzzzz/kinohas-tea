import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getEnabledPopups, getGlobalSettings } from '../../lib/firestore'
import type { Popup } from '../../types'
import EntryPopupGroup from './EntryPopupGroup'
import FloatingWindow from './FloatingWindow'
import SidebarBanners from './SidebarBanners'

/** 隨機位置：避開畫面中央(30%-70%)區域，不擋 Hero 主文案 */
function randomPos(): { x: number; y: number } {
  const w = window.innerWidth
  const h = window.innerHeight
  const x = Math.random() < 0.5 ? Math.random() * w * 0.25 : w * 0.65 + Math.random() * w * 0.2
  const y = h * 0.1 + Math.random() * h * 0.7
  return { x: Math.max(8, x), y: Math.max(8, y) }
}

/** 從陣列隨機取樣 n 筆(不重複)，n >= 陣列長度時回傳整份洗牌結果 */
function sample<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, arr.length))
}

export default function PopupLayer() {
  const { pathname } = useLocation()
  const [popups, setPopups] = useState<Popup[]>([])
  const [entryPopupCount, setEntryPopupCount] = useState(1)
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [zOrder, setZOrder] = useState<string[]>([])

  useEffect(() => {
    getEnabledPopups().then(setPopups).catch(() => {})
    getGlobalSettings().then(s => setEntryPopupCount(s.entryPopupCount ?? 1)).catch(() => {})
  }, [])

  const entryCandidates = useMemo(() => popups.filter(p => p.type === 'entry'), [popups])

  // entryPopupCount: -1=全部隨機不重疊；0=不顯示；1-6=固定排列(取樣至多該數量，不足則用實際數量的排列)
  const entryPopups = useMemo(() => {
    if (entryPopupCount === 0 || entryCandidates.length === 0) return []
    if (entryPopupCount === -1) return entryCandidates
    return sample(entryCandidates, entryPopupCount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryCandidates.map(p => p.id).join(','), entryPopupCount])

  const floats = useMemo(() => {
    const all = popups.filter(p => p.type === 'floating')
    const limit = window.innerWidth < 640 ? 2 : all.length
    return all.slice(0, limit).map(p => ({ popup: p, initial: randomPos() }))
  }, [popups])

  const banners = useMemo(() => popups.filter(p => p.type === 'banner' && p.imageUrl), [popups])

  if (pathname.startsWith('/admin')) return null

  return (
    <>
      <SidebarBanners banners={banners} />
      <EntryPopupGroup popups={entryPopups} randomMode={entryPopupCount === -1} />
      {floats.filter(f => !closed.has(f.popup.id)).map(f => (
        <FloatingWindow
          key={f.popup.id}
          popup={f.popup}
          initial={f.initial}
          zIndex={50 + zOrder.indexOf(f.popup.id) + 1}
          onFocus={() => setZOrder(o => [...o.filter(id => id !== f.popup.id), f.popup.id])}
          onClose={() => setClosed(s => new Set(s).add(f.popup.id))}
        />
      ))}
    </>
  )
}
