import type { MenuItem } from '../types'

export const CRYSTAL_ID_MIN = 2
export const CRYSTAL_ID_MAX = 19
export const ACTIVE_ORDER_WINDOW_MS = 12 * 60 * 60 * 1000

export function isCrystal(itemId: number): boolean {
  return itemId >= CRYSTAL_ID_MIN && itemId <= CRYSTAL_ID_MAX
}

export function isOutOfStock(
  item: Pick<MenuItem, 'stock' | 'unlimited'>,
  realModeEnabled: boolean
): boolean {
  return realModeEnabled && !item.unlimited && (item.stock ?? 0) <= 0
}
