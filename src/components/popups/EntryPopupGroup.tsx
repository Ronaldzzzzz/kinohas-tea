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

  // 位置只依「原始清單」配置一次；關閉個別彈窗(closed 變化)不重新排版，其餘彈窗維持原位
  useEffect(() => {
    if (popups.length === 0) return
    if (randomMode) {
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
  }, [randomMode, popups.map(p => p.id).join(',')])

  const visible = popups.filter(p => !closed.has(p.id))
  if (visible.length === 0) return null

  return (
    <div className="fixed inset-0 z-[90] bg-black/60">
      {visible.map((popup) => (
        <EntryPopupBox
          key={popup.id}
          popup={popup}
          onClose={() => setClosed(s => new Set(s).add(popup.id))}
          anchor={!randomMode ? fixedAnchorById[popup.id] : undefined}
          pixelPos={randomMode ? randomBoxById[popup.id] : undefined}
        />
      ))}
    </div>
  )
}
