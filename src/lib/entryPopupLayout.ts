export interface Anchor {
  xPct: number
  yPct: number
}

const LEFT = 20
const CENTER = 50
const RIGHT = 80
const TOP = 30
const MID = 50
const BOTTOM = 70

/** 固定排列錨點(百分比座標，相對視窗)：1 置中；2 左右；3 左中右；4 四角；5 四角+置中；6 兩排三欄 */
const LAYOUTS: Record<number, Anchor[]> = {
  1: [{ xPct: CENTER, yPct: MID }],
  2: [{ xPct: LEFT, yPct: MID }, { xPct: RIGHT, yPct: MID }],
  3: [{ xPct: LEFT, yPct: MID }, { xPct: CENTER, yPct: MID }, { xPct: RIGHT, yPct: MID }],
  4: [
    { xPct: LEFT, yPct: TOP }, { xPct: RIGHT, yPct: TOP },
    { xPct: LEFT, yPct: BOTTOM }, { xPct: RIGHT, yPct: BOTTOM },
  ],
  5: [
    { xPct: LEFT, yPct: TOP }, { xPct: RIGHT, yPct: TOP },
    { xPct: LEFT, yPct: BOTTOM }, { xPct: RIGHT, yPct: BOTTOM },
    { xPct: CENTER, yPct: MID },
  ],
  6: [
    { xPct: LEFT, yPct: TOP }, { xPct: CENTER, yPct: TOP }, { xPct: RIGHT, yPct: TOP },
    { xPct: LEFT, yPct: BOTTOM }, { xPct: CENTER, yPct: BOTTOM }, { xPct: RIGHT, yPct: BOTTOM },
  ],
}

/** 依實際顯示數量(1-6)回傳固定排列錨點；超出範圍時夾在 1-6 之間 */
export function getFixedLayout(count: number): Anchor[] {
  const n = Math.max(1, Math.min(6, count))
  return LAYOUTS[n]
}

export interface Box {
  x: number
  y: number
}

/**
 * -1 模式：在視窗內隨機找不重疊的位置(碰撞檢測 + 重試)。
 * 找不到不重疊位置的多餘項目，退回最後嘗試的座標(視窗過小/數量過多時的降級行為，仍會顯示，只是可能重疊)。
 */
export function getRandomNonOverlapping(
  count: number,
  viewport: { width: number; height: number },
  boxSize: { width: number; height: number },
  maxAttempts = 30,
): Box[] {
  const placed: Box[] = []
  const marginX = boxSize.width / 2 + 8
  const marginY = boxSize.height / 2 + 8

  for (let i = 0; i < count; i++) {
    let best: Box = {
      x: marginX + Math.random() * Math.max(1, viewport.width - marginX * 2),
      y: marginY + Math.random() * Math.max(1, viewport.height - marginY * 2),
    }
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate: Box = {
        x: marginX + Math.random() * Math.max(1, viewport.width - marginX * 2),
        y: marginY + Math.random() * Math.max(1, viewport.height - marginY * 2),
      }
      const overlaps = placed.some(p =>
        Math.abs(p.x - candidate.x) < boxSize.width && Math.abs(p.y - candidate.y) < boxSize.height
      )
      if (!overlaps) {
        best = candidate
        break
      }
      best = candidate
    }
    placed.push(best)
  }
  return placed
}
