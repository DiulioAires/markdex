import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

describe('AppShell layout', () => {
  it('renders the activity bar as a landmark that appears before the explorer/workspace body', () => {
    render(
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
      />,
    )

    const activityBar = screen.getByRole('navigation', { name: 'Barra de atividade' })
    const explorer = screen.getByLabelText('Explorador de arquivos')
    // compareDocumentPosition bit 4 (0b0100) = DOCUMENT_POSITION_FOLLOWING:
    // activityBar comes before explorer in the DOM.
    expect(activityBar.compareDocumentPosition(explorer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
