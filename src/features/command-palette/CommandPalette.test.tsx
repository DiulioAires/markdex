import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CommandPalette } from './CommandPalette'
import type { CommandItem } from './commands'

function makeItems(): CommandItem[] {
  return [
    { id: '1', label: 'Abrir projeto', shortcut: 'Ctrl+O', run: vi.fn() },
    { id: '2', label: 'Salvar arquivo', shortcut: 'Ctrl+S', run: vi.fn() },
    { id: '3', label: 'Comando desabilitado', disabled: true, run: vi.fn() },
  ]
}

describe('CommandPalette', () => {
  it('renders all items initially', () => {
    const items = makeItems()
    render(<CommandPalette items={items} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Abrir projeto/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Salvar arquivo/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Comando desabilitado/ })).toBeInTheDocument()
  })

  it('filters the list as the user types', async () => {
    const user = userEvent.setup()
    const items = makeItems()
    render(<CommandPalette items={items} onClose={vi.fn()} />)

    await user.type(screen.getByPlaceholderText('Digite um comando...'), 'salvar')

    expect(screen.getByRole('button', { name: /Salvar arquivo/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Abrir projeto/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Comando desabilitado/ })).not.toBeInTheDocument()
  })

  it('runs the first item and closes on ArrowDown then Enter', async () => {
    const user = userEvent.setup()
    const items = makeItems()
    const onClose = vi.fn()
    render(<CommandPalette items={items} onClose={onClose} />)

    const input = screen.getByPlaceholderText('Digite um comando...')
    await user.type(input, '{ArrowDown}')
    await user.type(input, '{Enter}')

    expect(items[0].run).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not run a disabled item when clicked', async () => {
    const user = userEvent.setup()
    const items = makeItems()
    const onClose = vi.fn()
    render(<CommandPalette items={items} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /Comando desabilitado/ }))

    expect(items[2].run).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows the empty state message when nothing matches', async () => {
    const user = userEvent.setup()
    const items = makeItems()
    render(<CommandPalette items={items} onClose={vi.fn()} />)

    await user.type(screen.getByPlaceholderText('Digite um comando...'), 'inexistente')

    expect(screen.getByText('Nenhum comando encontrado.')).toBeInTheDocument()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<CommandPalette items={makeItems()} onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(<CommandPalette items={makeItems()} onClose={onClose} />)

    await user.click(container.querySelector('.overlay-backdrop') as Element)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('focuses the input on mount', () => {
    render(<CommandPalette items={makeItems()} onClose={vi.fn()} />)

    expect(screen.getByPlaceholderText('Digite um comando...')).toHaveFocus()
  })

  it('runs a non-disabled item and closes when clicked', async () => {
    const user = userEvent.setup()
    const items = makeItems()
    const onClose = vi.fn()
    render(<CommandPalette items={items} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /Salvar arquivo/ }))

    expect(items[1].run).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
