import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

function renderAppShell(props: Partial<ComponentProps<typeof AppShell>> = {}) {
  return render(
    <AppShell
      viewMode="editor"
      onSelectViewMode={vi.fn()}
      onOpenProject={vi.fn()}
      isOpening={false}
      projectName={null}
      fileType={null}
      cursor={null}
      isDirty={false}
      isSaving={false}
      onSave={vi.fn()}
      explorerSlot={<div>explorer</div>}
      workspaceSlot={<div>workspace</div>}
      {...props}
    />,
  )
}

describe('AppShell layout', () => {
  it('renders the activity bar as a landmark that appears before the explorer/workspace body', () => {
    renderAppShell()

    const activityBar = screen.getByRole('navigation', { name: 'Barra de atividade' })
    const explorer = screen.getByLabelText('Explorador de arquivos')
    // compareDocumentPosition bit 4 (0b0100) = DOCUMENT_POSITION_FOLLOWING:
    // activityBar comes before explorer in the DOM.
    expect(activityBar.compareDocumentPosition(explorer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('AppShell overlay slots', () => {
  it('renders settingsSlot and commandPaletteSlot content when provided', () => {
    renderAppShell({
      settingsSlot: <div role="dialog">settings content</div>,
      commandPaletteSlot: <div role="dialog">palette content</div>,
    })

    expect(screen.getByText('settings content')).toBeInTheDocument()
    expect(screen.getByText('palette content')).toBeInTheDocument()
  })

  it('renders nothing extra for the overlay slots when they are omitted', () => {
    renderAppShell()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('forwards onOpenSettings and onOpenCommandPalette to the ActivityBar buttons', async () => {
    const user = userEvent.setup()
    const onOpenSettings = vi.fn()
    const onOpenCommandPalette = vi.fn()
    renderAppShell({ onOpenSettings, onOpenCommandPalette })

    await user.click(screen.getByRole('button', { name: 'Configurações' }))
    await user.click(screen.getByRole('button', { name: /paleta de comandos/i }))

    expect(onOpenSettings).toHaveBeenCalledTimes(1)
    expect(onOpenCommandPalette).toHaveBeenCalledTimes(1)
  })
})
