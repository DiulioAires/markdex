import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '../../stores/settings-store'
import { SettingsPanel } from './SettingsPanel'

describe('SettingsPanel', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettingsStore.getState().setEditorFontSize('medium')
  })

  it('renders the three section headings', () => {
    render(<SettingsPanel onClose={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Aparência' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Atalhos de teclado' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sobre' })).toBeInTheDocument()
  })

  it('updates the settings store when a font-size button is clicked', async () => {
    const user = userEvent.setup()
    render(<SettingsPanel onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Grande' }))

    expect(useSettingsStore.getState().editorFontSize).toBe('large')
  })

  it('marks the currently active font-size button as pressed', () => {
    useSettingsStore.getState().setEditorFontSize('small')
    render(<SettingsPanel onClose={vi.fn()} />)

    const smallButton = screen.getByRole('button', { name: 'Pequena' })
    const mediumButton = screen.getByRole('button', { name: 'Média' })

    expect(smallButton).toHaveAttribute('aria-pressed', 'true')
    expect(smallButton).toHaveClass('settings-panel__button--active')
    expect(mediumButton).toHaveAttribute('aria-pressed', 'false')
    expect(mediumButton).not.toHaveClass('settings-panel__button--active')
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<SettingsPanel onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<SettingsPanel onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Fechar configurações' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(<SettingsPanel onClose={onClose} />)

    await user.click(container.querySelector('.overlay-backdrop') as Element)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when the panel itself is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<SettingsPanel onClose={onClose} />)

    await user.click(screen.getByText('Markdex'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('moves focus to the close button on mount', () => {
    render(<SettingsPanel onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Fechar configurações' })).toHaveFocus()
  })
})
