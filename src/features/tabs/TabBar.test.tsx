import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TabBar } from './TabBar'
import type { DocumentTab, ProjectEntry } from '../../types/project'

function makeProject(overrides: Partial<ProjectEntry['info']>): ProjectEntry {
  return {
    info: { name: 'Project', rootPath: 'C:\\project', ...overrides },
    tree: [],
    isExpanded: true,
    isLoadingTree: false,
    treeError: null,
  }
}

const projects: ProjectEntry[] = [makeProject({})]

function makeTab(overrides: Partial<DocumentTab>): DocumentTab {
  return {
    name: 'notes.md',
    path: 'C:\\project\\notes.md',
    relativePath: 'notes.md',
    rootPath: 'C:\\project',
    savedContent: '# Notes',
    content: '# Notes',
    isDirty: false,
    hasExternalConflict: false,
    isLoading: false,
    error: null,
    cursor: { line: 1, column: 1 },
    ...overrides,
  }
}

const readme = makeTab({
  name: 'README.md',
  path: 'C:\\project\\docs\\README.md',
  relativePath: 'docs/README.md',
})

const notes = makeTab({
  name: 'notes.md',
  path: 'C:\\project\\notes.md',
  relativePath: 'notes.md',
  isDirty: true,
})

const tabs = [readme, notes]

describe('TabBar', () => {
  it('renders a tablist with the active tab aria-selected=true', () => {
    render(
      <TabBar
        tabs={tabs}
        activeTabPath={readme.path}
        projects={projects}
        onActivateTab={vi.fn()}
        onCloseTab={vi.fn()}
      />,
    )

    expect(screen.getByRole('tablist')).toBeInTheDocument()

    const activeTab = screen.getByRole('tab', { name: /README\.md/ })
    expect(activeTab).toHaveAttribute('aria-selected', 'true')

    const inactiveTab = screen.getByRole('tab', { name: /notes\.md/ })
    expect(inactiveTab).toHaveAttribute('aria-selected', 'false')
  })

  it('exposes the dirty indicator as text, not color alone', () => {
    render(
      <TabBar
        tabs={tabs}
        activeTabPath={readme.path}
        projects={projects}
        onActivateTab={vi.fn()}
        onCloseTab={vi.fn()}
      />,
    )

    const dirtyTab = screen.getByRole('tab', { name: /notes\.md/ })
    expect(dirtyTab).toHaveTextContent('Alterações não salvas')
  })

  it('does not show the dirty indicator text for a clean tab', () => {
    render(
      <TabBar
        tabs={tabs}
        activeTabPath={readme.path}
        projects={projects}
        onActivateTab={vi.fn()}
        onCloseTab={vi.fn()}
      />,
    )

    const cleanTab = screen.getByRole('tab', { name: /README\.md/ })
    expect(cleanTab).not.toHaveTextContent('Alterações não salvas')
  })

  it('shows the full path in the tab title attribute', () => {
    render(
      <TabBar
        tabs={tabs}
        activeTabPath={readme.path}
        projects={projects}
        onActivateTab={vi.fn()}
        onCloseTab={vi.fn()}
      />,
    )

    const activeTab = screen.getByRole('tab', { name: /README\.md/ })
    expect(activeTab).toHaveAttribute('title', readme.path)
  })

  it('activates a clicked inactive tab', async () => {
    const user = userEvent.setup()
    const onActivateTab = vi.fn()
    render(
      <TabBar
        tabs={tabs}
        activeTabPath={readme.path}
        projects={projects}
        onActivateTab={onActivateTab}
        onCloseTab={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('tab', { name: /notes\.md/ }))

    expect(onActivateTab).toHaveBeenCalledTimes(1)
    expect(onActivateTab).toHaveBeenCalledWith(notes.path)
  })

  it('renders a close button with a file-specific accessible label per tab', () => {
    render(
      <TabBar
        tabs={tabs}
        activeTabPath={readme.path}
        projects={projects}
        onActivateTab={vi.fn()}
        onCloseTab={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Fechar README.md' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechar notes.md' })).toBeInTheDocument()
  })

  it('calls onCloseTab with the tab path when the close button is clicked, without activating the tab', async () => {
    const user = userEvent.setup()
    const onActivateTab = vi.fn()
    const onCloseTab = vi.fn()
    render(
      <TabBar
        tabs={tabs}
        activeTabPath={readme.path}
        projects={projects}
        onActivateTab={onActivateTab}
        onCloseTab={onCloseTab}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Fechar notes.md' }))

    expect(onCloseTab).toHaveBeenCalledTimes(1)
    expect(onCloseTab).toHaveBeenCalledWith(notes.path)
    expect(onActivateTab).not.toHaveBeenCalled()
  })

  it('applies roving tabIndex: only the active tab is focusable via tabIndex=0', () => {
    render(
      <TabBar
        tabs={tabs}
        activeTabPath={readme.path}
        projects={projects}
        onActivateTab={vi.fn()}
        onCloseTab={vi.fn()}
      />,
    )

    const activeTab = screen.getByRole('tab', { name: /README\.md/ })
    const inactiveTab = screen.getByRole('tab', { name: /notes\.md/ })

    expect(activeTab).toHaveAttribute('tabIndex', '0')
    expect(inactiveTab).toHaveAttribute('tabIndex', '-1')
  })

  it('disambiguates same-named tabs from different projects with the owning project name', () => {
    const workProject = makeProject({ name: 'Work', rootPath: 'C:\\work' })
    const blogProject = makeProject({ name: 'Blog', rootPath: 'C:\\blog' })
    const workReadme = makeTab({
      name: 'README.md',
      path: 'C:\\work\\README.md',
      relativePath: 'README.md',
      rootPath: 'C:\\work',
    })
    const blogReadme = makeTab({
      name: 'README.md',
      path: 'C:\\blog\\README.md',
      relativePath: 'README.md',
      rootPath: 'C:\\blog',
    })

    render(
      <TabBar
        tabs={[workReadme, blogReadme]}
        activeTabPath={workReadme.path}
        projects={[workProject, blogProject]}
        onActivateTab={vi.fn()}
        onCloseTab={vi.fn()}
      />,
    )

    expect(screen.getByText('README.md — Work')).toBeInTheDocument()
    expect(screen.getByText('README.md — Blog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechar README.md — Work' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechar README.md — Blog' })).toBeInTheDocument()
  })

  it('keeps the plain name for tabs whose names do not collide', () => {
    render(
      <TabBar
        tabs={tabs}
        activeTabPath={readme.path}
        projects={projects}
        onActivateTab={vi.fn()}
        onCloseTab={vi.fn()}
      />,
    )

    expect(screen.getByText('README.md')).toBeInTheDocument()
    expect(screen.getByText('notes.md')).toBeInTheDocument()
    expect(screen.queryByText(/—/)).not.toBeInTheDocument()
  })
})
