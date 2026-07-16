// src/components/admin/CropTool.tsx
import { useEffect, useRef, useState } from 'react'
import type { CropData } from '../../types'

interface CropToolProps {
  imageUrl: string
  initialCropData?: CropData
  onSave: (cropData: CropData) => void
  onCancel: () => void
  isSaving?: boolean
  errorMessage?: string | null
}

// 拍立得圖片顯示區：176×172px（200-4border-20padding × 220-4border-10top-34bottom）
const POLAROID_W = 176
const POLAROID_H = 172

const DEFAULT_CROP: CropData = { x: 10, y: 10, width: 80, height: 80 }

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export default function CropTool({ imageUrl, initialCropData, onSave, onCancel, isSaving, errorMessage }: CropToolProps) {
  const [cropData, setCropData] = useState<CropData>(initialCropData ?? DEFAULT_CROP)

  // 容器 ref，用於計算百分比
  const containerRef = useRef<HTMLDivElement>(null)
  // 原圖自然尺寸 ratio（naturalHeight / naturalWidth），圖片載入後設定
  const naturalAspectRef = useRef<number>(1)

  /**
   * 根據 widthPct 計算鎖定比例的 heightPct：
   * - CSS frame 在容器中：frameW = (w/100)*cW, frameH = (h/100)*cH
   * - 容器比例 cW/cH = naturalW/naturalH
   * - 要讓 frameW/frameH = POLAROID_W/POLAROID_H：
   *   h = w * (naturalH/naturalW) * (POLAROID_H/POLAROID_W)
   */
  function lockedHeight(widthPct: number): number {
    return widthPct * (POLAROID_H / POLAROID_W) / naturalAspectRef.current
  }

  // 圖片載入後捕捉自然比例，並修正初始 cropData 的 height
  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget
    naturalAspectRef.current = img.naturalHeight / img.naturalWidth
    setCropData(prev => ({
      ...prev,
      height: clamp(lockedHeight(prev.width), 5, 100 - prev.y),
    }))
  }

  // 拖動狀態，用 ref 避免 stale closure
  const dragState = useRef<{
    type: 'move' | 'resize'
    startX: number
    startY: number
    startCrop: CropData
    rect: DOMRect
  } | null>(null)

  // 記錄當前 listeners，供 unmount 清理
  const cleanupRef = useRef<{ move: (e: MouseEvent) => void; up: () => void } | null>(null)

  // unmount 時清除懸掛的 window listeners
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        window.removeEventListener('mousemove', cleanupRef.current.move)
        window.removeEventListener('mouseup', cleanupRef.current.up)
      }
    }
  }, [])

  // Escape 鍵取消
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  function startDrag(e: React.MouseEvent, type: 'move' | 'resize') {
    e.preventDefault()
    e.stopPropagation()
    if (!containerRef.current) return

    dragState.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...cropData },
      rect: containerRef.current.getBoundingClientRect(),
    }

    const handleMouseMove = (me: MouseEvent) => {
      const ds = dragState.current
      if (!ds) return

      const { rect, startX, startY, startCrop, type: dragType } = ds
      const dxPct = ((me.clientX - startX) / rect.width) * 100
      const dyPct = ((me.clientY - startY) / rect.height) * 100

      if (dragType === 'move') {
        const newX = clamp(startCrop.x + dxPct, 0, 100 - startCrop.width)
        const newY = clamp(startCrop.y + dyPct, 0, 100 - startCrop.height)
        setCropData(prev => ({ ...prev, x: newX, y: newY }))
      } else {
        // resize：僅根據水平拖動改 width，height 自動鎖定拍立得比例
        const newWidth = clamp(startCrop.width + dxPct, 10, 100 - startCrop.x)
        const newHeight = clamp(lockedHeight(newWidth), 5, 100 - startCrop.y)
        setCropData(prev => ({ ...prev, width: newWidth, height: newHeight }))
      }
    }

    const handleMouseUp = () => {
      dragState.current = null
      cleanupRef.current = null
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    cleanupRef.current = { move: handleMouseMove, up: handleMouseUp }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const roundPct = (n: number) => Math.round(n)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.80)' }}
    >
      <div
        className="flex flex-col gap-4 rounded-lg p-4"
        style={{
          background: 'var(--color-bg-card, #1a1209)',
          border: '1px solid var(--color-border-gold, #c9a55a)',
          maxWidth: '95vw',
        }}
      >
        {/* 標題 */}
        <h2
          className="text-sm font-semibold tracking-wide"
          style={{ color: 'var(--color-gold-primary, #c9a55a)' }}
        >
          設定顯示區域
        </h2>

        {/* 圖片編輯區 */}
        <div
          ref={containerRef}
          className="relative select-none overflow-hidden rounded"
          style={{ display: 'inline-block', lineHeight: 0 }}
        >
          <img
            src={imageUrl}
            alt="裁剪預覽"
            draggable={false}
            onLoad={handleImageLoad}
            style={{
              display: 'block',
              maxHeight: '70vh',
              maxWidth: '90vw',
              userSelect: 'none',
            }}
          />

          {/* 紅框（鏤空遮罩效果） */}
          <div
            style={{
              position: 'absolute',
              left: `${cropData.x}%`,
              top: `${cropData.y}%`,
              width: `${cropData.width}%`,
              height: `${cropData.height}%`,
              border: '2px solid #ef4444',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
              cursor: 'move',
              boxSizing: 'border-box',
            }}
            onMouseDown={e => startDrag(e, 'move')}
          >
            {/* 右下角調整大小把手 */}
            <div
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: 8,
                height: 8,
                background: '#ffffff',
                cursor: 'se-resize',
              }}
              onMouseDown={e => startDrag(e, 'resize')}
            />
          </div>
        </div>

        {/* 底部資訊與按鈕 */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span
            className="text-xs font-mono"
            style={{ color: 'var(--color-text-muted, #a0856a)' }}
          >
            x: {roundPct(cropData.x)}%, y: {roundPct(cropData.y)}%,{' '}
            w: {roundPct(cropData.width)}%{' '}
            <span style={{ opacity: 0.6 }}>(比例鎖定 176:172)</span>
          </span>

          <div className="flex flex-col items-end gap-2">
            {errorMessage && (
              <p style={{ color: '#f87171', fontSize: '0.75rem', marginBottom: '8px' }}>
                {errorMessage}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="text-xs px-4 py-1.5 rounded border transition-colors"
                style={{
                  borderColor: 'var(--color-border-gold, #c9a55a)',
                  color: 'var(--color-text-primary, #f5deb3)',
                  background: 'transparent',
                }}
              >
                取消
              </button>
              <button
                onClick={() => onSave(cropData)}
                disabled={isSaving}
                style={{
                  background: '#c9a55a',
                  color: '#1a1209',
                  padding: '8px 20px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.5 : 1,
                  fontWeight: 600,
                }}
              >
                {isSaving ? '儲存中…' : '確定'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
