import { describe, it, expect } from 'vitest'
import { nextQuality } from './imageCompress'

describe('nextQuality 品質階梯', () => {
  it('從 0.8 逐階遞減 0.1', () => {
    expect(nextQuality(0.8)).toBeCloseTo(0.7)
    expect(nextQuality(0.7)).toBeCloseTo(0.6)
    expect(nextQuality(0.6)).toBeCloseTo(0.5)
  })
  it('低於下限 0.5 回傳 null(停止再壓)', () => {
    expect(nextQuality(0.5)).toBeNull()
    expect(nextQuality(0.45)).toBeNull()
  })
})
