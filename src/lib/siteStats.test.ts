import { describe, it, expect } from 'vitest'
import { formatCounter } from './siteStats'

describe('formatCounter', () => {
  it('補零至 6 位', () => {
    expect(formatCounter(42)).toBe('000042')
  })
  it('超過 6 位時原樣顯示，不截斷', () => {
    expect(formatCounter(1234567)).toBe('1234567')
  })
  it('0 顯示為全零', () => {
    expect(formatCounter(0)).toBe('000000')
  })
})
