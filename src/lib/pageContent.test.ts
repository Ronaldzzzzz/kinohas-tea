import { describe, it, expect } from 'vitest'
import { mapStoryData, mapDirectionsData } from './firestore'

describe('mapStoryData', () => {
  it('無資料時回傳 3 個空白 section', () => {
    const result = mapStoryData(undefined)
    expect(result.sections).toHaveLength(3)
    result.sections.forEach(s => {
      expect(s.title).toBe('')
      expect(s.text).toBe('')
      expect(s.imageUrl).toBeUndefined()
    })
  })

  it('補齊不足 3 筆的 sections', () => {
    const result = mapStoryData({ sections: [{ title: 'A', text: 'a', imageUrl: 'url-a' }] })
    expect(result.sections).toHaveLength(3)
    expect(result.sections[0]).toEqual({ title: 'A', text: 'a', imageUrl: 'url-a' })
    expect(result.sections[1]).toEqual({ title: '', text: '', imageUrl: undefined })
  })

  it('保留完整 3 筆資料', () => {
    const raw = {
      sections: [
        { title: '創業', text: '一段故事', imageUrl: 'url-1' },
        { title: '轉型', text: '第二段', imageUrl: 'url-2' },
        { title: '現在', text: '第三段' },
      ],
    }
    const result = mapStoryData(raw)
    expect(result.sections[2]).toEqual({ title: '現在', text: '第三段', imageUrl: undefined })
  })
})

describe('mapDirectionsData', () => {
  it('無資料時回傳空白預設值', () => {
    expect(mapDirectionsData(undefined)).toEqual({ title: '', text: '', mapImageUrl: undefined })
  })

  it('保留既有資料', () => {
    const result = mapDirectionsData({ title: '怎麼來', text: '搭傳送', mapImageUrl: 'map-url' })
    expect(result).toEqual({ title: '怎麼來', text: '搭傳送', mapImageUrl: 'map-url' })
  })
})
