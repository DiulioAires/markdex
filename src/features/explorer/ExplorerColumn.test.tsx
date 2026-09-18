import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ExplorerColumn } from './ExplorerColumn'
import type { ProjectEntry, FileNode } from '../../types/project'

const readme: FileNode = { kind: 'file', name: 'README.md', path: 'C:\\work\\README.md', relativePath: 'README.md' }
const other: FileNode = { kind: 'file', name: 'notes.md', path: 'C:\\other\\notes.md', relativePath: 'notes.md' }

const work: ProjectEntry = {
  info: { name: 'Work', rootPath: 'C:\\work' },
  tree: [readme],
  isExpanded: true,
  isLoadingTree: false,
  treeError: null,
}

const otherProject: ProjectEntry = {
  info: { name: 'Other', rootPath: 'C:\\other' },
  tree: [other],
  isExpanded: true,
  isLoadingTree: false,
  treeError: null,
}

describe('ExplorerColumn', () => {
  it('renders one section per open project, in order', () => {
    render(
      <ExplorerColumn
        projects={[work, otherProject]}
        activeFilePath={null}
        onOpenFile={vi.fn()}
        onToggleExpand={vi.fn()}
        onRefresh={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const headings = screen.getAllByRole('button', { name: /^(work|other)$/i })
    expect(headings.map((el) => el.textContent)).toEqual(['▾Work', '▾Other'])
    expect(screen.getByText('README.md')).toBeInTheDocument()
    expect(screen.getByText('notes.md')).toBeInTheDocument()
  })

  it('calls onOpenFile with the clicked file', async () => {
    const user = userEvent.setup()
    const onOpenFile = vi.fn()
    render(
      <ExplorerColumn
        projects={[work]}
        activeFilePath={null}
        onOpenFile={onOpenFile}
        onToggleExpand={vi.fn()}
        onRefresh={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByText('README.md'))
    expect(onOpenFile).toHaveBeenCalledWith(readme, work.info.rootPath)
  })

  it('calls onClose with the closed project rootPath, leaving the other section alone', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ExplorerColumn
        projects={[work, otherProject]}
        activeFilePath={null}
        onOpenFile={vi.fn()}
        onToggleExpand={vi.fn()}
        onRefresh={vi.fn()}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Fechar projeto Work' }))
    expect(onClose).toHaveBeenCalledWith('C:\\work')
  })

  it('calls onToggleExpand and onRefresh with the matching project rootPath', async () => {
    const user = userEvent.setup()
    const onToggleExpand = vi.fn()
    const onRefresh = vi.fn()
    render(
      <ExplorerColumn
        projects={[work, otherProject]}
        activeFilePath={null}
        onOpenFile={vi.fn()}
        onToggleExpand={onToggleExpand}
        onRefresh={onRefresh}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Other' }))
    expect(onToggleExpand).toHaveBeenCalledWith('C:\\other')

    await user.click(screen.getByRole('button', { name: 'Atualizar árvore de Work' }))
    expect(onRefresh).toHaveBeenCalledWith('C:\\work')
  })
})
