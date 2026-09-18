import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ExplorerPanel } from './ExplorerPanel'
import type { ProjectEntry } from '../../types/project'

const readme = { kind: 'file' as const, name: 'README.md', path: 'C:\\work\\README.md', relativePath: 'README.md' }

function makeEntry(overrides: Partial<ProjectEntry> = {}): ProjectEntry {
  return {
    info: { name: 'Work', rootPath: 'C:\\work' },
    tree: [readme],
    isExpanded: true,
    isLoadingTree: false,
    treeError: null,
    ...overrides,
  }
}

describe('ExplorerPanel', () => {
  it('shows the project name and exposes its expanded state', () => {
    render(
      <ExplorerPanel
        project={makeEntry()}
        activeFilePath={null}
        onOpenFile={vi.fn()}
        onToggleExpand={vi.fn()}
        onRefresh={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /work/i, expanded: true })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('README.md')).toBeInTheDocument()
  })

  it('hides the tree when collapsed', () => {
    render(
      <ExplorerPanel
        project={makeEntry({ isExpanded: false })}
        activeFilePath={null}
        onOpenFile={vi.fn()}
        onToggleExpand={vi.fn()}
        onRefresh={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByText('README.md')).not.toBeInTheDocument()
  })

  it('calls onToggleExpand when the header button is clicked', async () => {
    const user = userEvent.setup()
    const onToggleExpand = vi.fn()
    render(
      <ExplorerPanel
        project={makeEntry()}
        activeFilePath={null}
        onOpenFile={vi.fn()}
        onToggleExpand={onToggleExpand}
        onRefresh={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /work/i, expanded: true }))
    expect(onToggleExpand).toHaveBeenCalledTimes(1)
  })

  it('calls onClose with a project-specific accessible label', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ExplorerPanel
        project={makeEntry()}
        activeFilePath={null}
        onOpenFile={vi.fn()}
        onToggleExpand={vi.fn()}
        onRefresh={vi.fn()}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByRole('button', { name: /fechar projeto work/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows a retryable error instead of the tree when treeError is set', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()
    render(
      <ExplorerPanel
        project={makeEntry({ treeError: 'pasta não encontrada' })}
        activeFilePath={null}
        onOpenFile={vi.fn()}
        onToggleExpand={vi.fn()}
        onRefresh={onRefresh}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('pasta não encontrada')).toBeInTheDocument()
    expect(screen.queryByText('README.md')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state with a refresh action when the tree has no files', () => {
    render(
      <ExplorerPanel
        project={makeEntry({ tree: [] })}
        activeFilePath={null}
        onOpenFile={vi.fn()}
        onToggleExpand={vi.fn()}
        onRefresh={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Nenhum arquivo Markdown encontrado')).toBeInTheDocument()
  })

  it('shows a loading skeleton instead of the tree while isLoadingTree is true', () => {
    render(
      <ExplorerPanel
        project={makeEntry({ isLoadingTree: true })}
        activeFilePath={null}
        onOpenFile={vi.fn()}
        onToggleExpand={vi.fn()}
        onRefresh={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('status', { name: /carregando/i })).toBeInTheDocument()
    expect(screen.queryByText('README.md')).not.toBeInTheDocument()
  })
})
