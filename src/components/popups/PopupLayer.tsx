import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getEnabledPopups } from '../../lib/firestore'
import type { Popup } from '../../types'
import EntryPopup from './EntryPopup'
import FloatingWindow from './FloatingWindow'

/** 隨機位置：避開畫面中央(30%-70%)區域，不擋 Hero 主文案 */
function randomPos(): { x: number; y: number } {
  const w = window.innerWidth
  const h = window.innerHeight
  const x = Math.random() < 0.5 ? Math.random() * w * 0.25 : w * 0.65 + Math.random() * w * 0.2
  const y = h * 0.1 + Math.random() * h * 0.7
  return { x: Math.max(8, x), y: Math.max(8, y) }
}

export default function PopupLayer() {
  const { pathname } = useLocation()
  const [popups, setPopups] = useState<Popup[]>([])
  const [entryOpen, setEntryOpen] = useState(true)
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [zOrder, setZOrder] = useState<string[]>([])

  useEffect(() => {
    getEnabledPopups().then(setPopups).catch(() => {})
  }, [])

  const entry = useMemo(() => {
    const candidates = popups.filter(p => p.type === 'entry')
    if (candidates.length === 0) return null
    return candidates[Math.floor(Math.random() * candidates.length)]
  }, [popups])

  const floats = useMemo(() => {
    const all = popups.filter(p => p.type === 'floating')
    const limit = window.innerWidth < 640 ? 2 : all.length
    return all.slice(0, limit).map(p => ({ popup: p, initial: randomPos() }))
  }, [popups])

  if (pathname.startsWith('/admin')) return null

  return (
    <>
      {entry && entryOpen && <EntryPopup popup={entry} onClose={() => setEntryOpen(false)} />}
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
