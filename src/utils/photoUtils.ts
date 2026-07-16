import type { CSSProperties } from 'react'
import type { PhotoUrl, CropData } from '../types'

export function getUrl(entry: string | PhotoUrl): string {
  return typeof entry === 'string' ? entry : entry.url
}

/**
 * 將 cropData 轉為 background-image 截取樣式。
 *
 * cropData 的 x/y/width/height 為原圖百分比（0-100），
 * 且 width/height 已由 CropTool 鎖定為拍立得顯示區比例（176:172）。
 *
 * 原理：
 *   background-size: (10000/width)% (10000/height)%
 *     → 讓截取區域的寬/高剛好等於容器寬/高
 *   background-position: (x/(100-width)*100)% (y/(100-height)*100)%
 *     → 讓截取區域的左上角對齊容器左上角
 *
 * 若無 cropData，退回 cover/center（等同拍立得預設顯示）。
 * 需搭配 backgroundImage: `url(...)` 使用，不適用於 <img> 元素。
 */
export function getCropStyle(cropData?: CropData): CSSProperties {
  if (!cropData) {
    return {
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
  }
  const { x, y, width, height } = cropData
  const bgSizeX = 10000 / width
  const bgSizeY = 10000 / height
  const bgPosX = width >= 100 ? 0 : Math.max(0, Math.min(100, (x / (100 - width)) * 100))
  const bgPosY = height >= 100 ? 0 : Math.max(0, Math.min(100, (y / (100 - height)) * 100))
  return {
    backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
    backgroundPosition: `${bgPosX}% ${bgPosY}%`,
    backgroundRepeat: 'no-repeat',
  }
}
