import { describe, it, expect } from 'vitest'
import { getFixedLayout, getRandomNonOverlapping } from './entryPopupLayout'

describe('getFixedLayout', () => {
  it('1 則置中', () => {
    expect(getFixedLayout(1)).toEqual([{ xPct: 50, yPct: 50 }])
  })
  it('2 則左右對稱、垂直置中', () => {
    const layout = getFixedLayout(2)
    expect(layout).toHaveLength(2)
    expect(layout.every(a => a.yPct === 50)).toBe(true)
    expect(layout[0].xPct).toBeLessThan(50)
    expect(layout[1].xPct).toBeGreaterThan(50)
  })
  it('6 則回傳兩排三欄共 6 個錨點', () => {
    expect(getFixedLayout(6)).toHaveLength(6)
  })
  it('超出 1-6 範圍時夾在邊界內', () => {
    expect(getFixedLayout(0)).toHaveLength(1)
    expect(getFixedLayout(99)).toHaveLength(6)
  })
})

describe('getRandomNonOverlapping', () => {
  it('回傳數量與 count 一致', () => {
    const boxes = getRandomNonOverlapping(5, { width: 1200, height: 800 }, { width: 100, height: 100 })
    expect(boxes).toHaveLength(5)
  })
  it('座標皆落在視窗範圍內', () => {
    const boxes = getRandomNonOverlapping(4, { width: 1000, height: 600 }, { width: 80, height: 80 })
    boxes.forEach(b => {
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.x).toBeLessThanOrEqual(1000)
      expect(b.y).toBeGreaterThanOrEqual(0)
      expect(b.y).toBeLessThanOrEqual(600)
    })
  })
})
