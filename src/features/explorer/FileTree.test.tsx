import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FileTree } from './FileTree'
import type { FileNode } from '../../types/project'

const readme: FileNode = {
  kind: 'file',
  name: 'README.md',
  path: 'C:\\project\\docs\\README.md',
  relativePath: 'docs/README.md',
}

const notes: FileNode = {
  kind: 'file',
  name: 'notes.md',
  path: 'C:\\project\\notes.md',
  relativePath: 'notes.md',
}

const docsDir: FileNode = {
  kind: 'directory',
  name: 'docs',
  path: 'C:\\project\\docs',
  relativePath: 'docs',
  children: [readme],
}

const tree: FileNode[] = [docsDir, notes]

describe('FileTree', () => {
  it('renders directories collapsed with aria-expanded=false and hides their children', () => {
    render(<FileTree nodes={tree} activeFilePath={null} onOpenFile={vi.fn()} />)

    const dirItem = screen.getByRole('treeitem', { name: /docs/ })
    expect(dirItem).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('README.md')).not.toBeInTheDocument()
  })

  it('toggles a directory open on click, revealing its children', async () => {
    const user = userEvent.setup()
    render(<FileTree nodes={tree} activeFilePath={null} onOpenFile={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /docs/ }))

    const dirItem = screen.getByRole('treeitem', { name: /docs/ })
    expect(dirItem).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('README.md')).toBeInTheDocument()
  })

  it('calls onOpenFile with the absolute path when a file is clicked', async () => {
    const user = userEvent.setup()
    const onOpenFile = vi.fn()
    render(<FileTree nodes={tree} activeFilePath={null} onOpenFile={onOpenFile} />)

    await user.click(screen.getByRole('button', { name: /docs/ }))
    await user.click(screen.getByRole('button', { name: /README\.md/ }))

    expect(onOpenFile).toHaveBeenCalledTimes(1)
    expect(onOpenFile).toHaveBeenCalledWith(readme)
    expect(onOpenFile.mock.calls[0][0].path).toBe('C:\\project\\docs\\README.md')
  })

  it('marks the active file with aria-current="page"', () => {
    render(<FileTree nodes={tree} activeFilePath={notes.path} onOpenFile={vi.fn()} />)

    const activeItem = screen.getByRole('treeitem', { name: /notes\.md/ })
    expect(activeItem).toHaveAttribute('aria-current', 'page')

    const dirItem = screen.getByRole('treeitem', { name: /docs/ })
    expect(dirItem).not.toHaveAttribute('aria-current')
  })

  it('indents nested nodes further than their parent', async () => {
    const user = userEvent.setup()
    render(<FileTree nodes={tree} activeFilePath={null} onOpenFile={vi.fn()} />)

    const dirButton = screen.getByRole('button', { name: /docs/ })
    const rootPadding = dirButton.style.paddingLeft

    await user.click(dirButton)

    const fileButton = screen.getByRole('button', { name: /README\.md/ })
    const nestedPadding = fileButton.style.paddingLeft

    expect(parseInt(nestedPadding, 10)).toBeGreaterThan(parseInt(rootPadding, 10))
  })
})
