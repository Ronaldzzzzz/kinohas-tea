import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MaskedContent from './MaskedContent'

describe('MaskedContent', () => {
  it('顯示置中遮蔽提示且原文模糊化', () => {
    render(<MaskedContent content="祕密內容" />)
    expect(screen.getByText(/▓ 此留言已被店家遮蔽/)).toBeInTheDocument()
    const masked = screen.getByText('祕密內容')
    expect(masked).toHaveClass('blur-sm')
    expect(masked).toHaveClass('select-none')
  })
  it('有附註時直接接在提示後,不帶「店家註」前綴', () => {
    render(<MaskedContent content="x" maskNote="含劇透" />)
    expect(screen.getByText(/此留言已被店家遮蔽：含劇透/)).toBeInTheDocument()
    expect(screen.queryByText(/店家註/)).not.toBeInTheDocument()
  })
  it('無附註時提示不帶冒號', () => {
    render(<MaskedContent content="x" />)
    const label = screen.getByText(/此留言已被店家遮蔽/)
    expect(label.textContent).not.toContain('：')
  })
})
