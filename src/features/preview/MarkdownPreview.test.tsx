import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownPreview } from './MarkdownPreview'

const CONTENT = `# Título

| Coluna A | Coluna B |
| --- | --- |
| 1 | 2 |

- [ ] Tarefa pendente
- [x] Tarefa concluída

[Anthropic](https://anthropic.com)

<script>window.__xss = true</script>
`

describe('MarkdownPreview', () => {
  it('renders a heading', () => {
    render(<MarkdownPreview content={CONTENT} />)
    expect(screen.getByRole('heading', { name: 'Título' })).toBeInTheDocument()
  })

  it('renders a GFM table', () => {
    render(<MarkdownPreview content={CONTENT} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '1' })).toBeInTheDocument()
  })

  it('renders GFM task list checkboxes', () => {
    render(<MarkdownPreview content={CONTENT} />)
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0].checked).toBe(false)
    expect(checkboxes[1].checked).toBe(true)
  })

  it('renders a safe external link with rel=noreferrer and target=_blank', () => {
    render(<MarkdownPreview content={CONTENT} />)
    const link = screen.getByRole('link', { name: 'Anthropic' })
    expect(link).toHaveAttribute('href', 'https://anthropic.com')
    expect(link).toHaveAttribute('rel', 'noreferrer')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('does not render raw script tags', () => {
    const { container } = render(<MarkdownPreview content={CONTENT} />)
    expect(container.querySelector('script')).not.toBeInTheDocument()
    expect(container.innerHTML).not.toContain('<script>')
  })
})
