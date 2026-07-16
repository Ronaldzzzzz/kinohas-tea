import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MaskedContent from './MaskedContent'

describe('MaskedContent', () => {
  it('顯示遮蔽標籤且原文以黑條呈現', () => {
    render(<MaskedContent content="祕密內容" />)
    expect(screen.getByText(/此留言已被店家遮蔽/)).toBeInTheDocument()
    const masked = screen.getByText('祕密內容')
    expect(masked).toHaveClass('select-none')
  })
  it('有店家註時顯示註解', () => {
    render(<MaskedContent content="x" maskNote="含劇透" />)
    expect(screen.getByText(/店家註[:：]\s*含劇透/)).toBeInTheDocument()
  })
  it('無店家註時不顯示註解列', () => {
    render(<MaskedContent content="x" />)
    expect(screen.queryByText(/店家註/)).not.toBeInTheDocument()
  })
})
