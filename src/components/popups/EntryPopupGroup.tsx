import { useEffect, useState } from 'react'
import type { Popup } from '../../types'
import { getFixedLayout, getRandomNonOverlapping, type Anchor, type Box } from '../../lib/entryPopupLayout'
import EntryPopupBox from './EntryPopupBox'

interface Props {
  /** 已依 entryPopupCount 設定篩選/取樣過的進版彈窗清單 */
  popups: Popup[]
  /** -1 模式：全部顯示、隨機不重疊；否則用固定排列 */
  randomMode: boolean
}

const BOX_SIZE = { width: 320, height: 280 }

/** 共用一層深色遮罩，內部依模式散布多個彈窗盒子，各自獨立 X 關閉 */
export default function EntryPopupGroup({ popups, randomMode }: Props) {
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [randomBoxById, setRandomBoxById] = useState<Record<string, Box>>({})
  const [fixedAnchorById, setFixedAnchorById] = useState<Record<string, Anchor>>({})

  // 手機版螢幕太窄，無法容納 20%/80% 這類多欄錨點(會跑版把關閉鍵擠出畫面)：
  // 一律置中堆疊，不論數量、不論隨機/固定模式
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const effectiveRandomMode = randomMode && !isMobile

  // 位置只依「原始清單」配置一次；關閉個別彈窗(closed 變化)不重新排版，其餘彈窗維持原位
  useEffect(() => {
    if (popups.length === 0) return
    if (isMobile) {
      const map: Record<string, Anchor> = {}
      popups.forEach((p) => { map[p.id] = { xPct: 50, yPct: 50 } })
      setFixedAnchorById(map)
    } else if (effectiveRandomMode) {
      const boxes = getRandomNonOverlapping(popups.length, { width: window.innerWidth, height: window.innerHeight }, BOX_SIZE)
      const map: Record<string, Box> = {}
      popups.forEach((p, i) => { map[p.id] = boxes[i] })
      setRandomBoxById(map)
    } else {
      const anchors = getFixedLayout(popups.length)
      const map: Record<string, Anchor> = {}
      popups.forEach((p, i) => { map[p.id] = anchors[i] })
      setFixedAnchorById(map)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, effectiveRandomMode, popups.map(p => p.id).join(',')])

  const visible = popups.filter(p => !closed.has(p.id))
  if (visible.length === 0) return null

  return (
    <div className="fixed inset-0 z-[90] bg-black/60">
      {visible.map((popup) => (
        <EntryPopupBox
          key={popup.id}
          popup={popup}
          onClose={() => setClosed(s => new Set(s).add(popup.id))}
          anchor={!effectiveRandomMode ? fixedAnchorById[popup.id] : undefined}
          pixelPos={effectiveRandomMode ? randomBoxById[popup.id] : undefined}
        />
      ))}
    </div>
  )
}
