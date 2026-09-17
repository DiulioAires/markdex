import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ViewModeSwitch } from './ViewModeSwitch'

describe('ViewModeSwitch', () => {
  it('renders labeled buttons for Editor, Preview and Dividido', () => {
    render(<ViewModeSwitch viewMode="editor" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Editor' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dividido' })).toBeInTheDocument()
  })

  it('marks the current view mode button as pressed', () => {
    render(<ViewModeSwitch viewMode="preview" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Editor' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Dividido' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with "preview" when the Preview button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ViewModeSwitch viewMode="editor" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Preview' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('preview')
  })

  it('calls onChange with "split" when the Dividido button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ViewModeSwitch viewMode="editor" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Dividido' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('split')
  })

  it('calls onChange with "editor" when the Editor button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ViewModeSwitch viewMode="split" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Editor' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('editor')
  })
})
