import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspaceStore } from './workspace-store'
import type { ProjectEntry } from '../types/project'

const file = {
  name: 'README.md',
  path: 'C:\\work\\README.md',
  relativePath: 'README.md',
  rootPath: 'C:\\work',
}

const second = {
  name: 'api.md',
  path: 'C:\\work\\api.md',
  relativePath: 'api.md',
  rootPath: 'C:\\work',
}

function makeProjectEntry(rootPath: string, name: string): ProjectEntry {
  return {
    info: { name, rootPath },
    tree: [],
    isExpanded: true,
    isLoadingTree: false,
    treeError: null,
  }
}

describe('workspace store', () => {
  beforeEach(() => useWorkspaceStore.getState().reset())

  it('reuses an existing tab instead of duplicating it', () => {
    useWorkspaceStore.getState().openTab(file, '# First')
    useWorkspaceStore.getState().openTab(file, '# First')
    expect(useWorkspaceStore.getState().tabs).toHaveLength(1)
  })

  it('derives dirty state from the current and saved content', () => {
    useWorkspaceStore.getState().openTab(file, '# First')
    useWorkspaceStore.getState().updateBuffer(file.path, '# Changed')
    expect(useWorkspaceStore.getState().tabs[0].isDirty).toBe(true)
    useWorkspaceStore.getState().markSaved(file.path)
    expect(useWorkspaceStore.getState().tabs[0].isDirty).toBe(false)
  })

  it('activates a neighboring tab when the active tab closes', () => {
    useWorkspaceStore.getState().openTab(file, '# First')
    useWorkspaceStore.getState().openTab(second, '# API')
    useWorkspaceStore.getState().closeTab(second.path)
    expect(useWorkspaceStore.getState().activeTabPath).toBe(file.path)
  })

  it('updates the cursor for the matching tab', () => {
    useWorkspaceStore.getState().openTab(file, '# First')
    useWorkspaceStore.getState().updateCursor(file.path, { line: 3, column: 7 })
    expect(useWorkspaceStore.getState().tabs[0].cursor).toEqual({ line: 3, column: 7 })
  })

  it('activates and changes the view mode without changing tabs', () => {
    useWorkspaceStore.getState().openTab(file, '# First')
    useWorkspaceStore.getState().openTab(second, '# API')
    useWorkspaceStore.getState().activateTab(file.path)
    useWorkspaceStore.getState().setViewMode('split')
    expect(useWorkspaceStore.getState().activeTabPath).toBe(file.path)
    expect(useWorkspaceStore.getState().viewMode).toBe('split')
    expect(useWorkspaceStore.getState().tabs).toHaveLength(2)
  })

  it('adds a project and keeps a previously added one untouched', () => {
    const first = makeProjectEntry('C:\\work', 'Work')
    const other = makeProjectEntry('C:\\other', 'Other')
    useWorkspaceStore.getState().addProject(first)
    useWorkspaceStore.getState().addProject(other)
    expect(useWorkspaceStore.getState().projects).toEqual([first, other])
  })

  it('does not add a project whose rootPath is already open', () => {
    const first = makeProjectEntry('C:\\work', 'Work')
    useWorkspaceStore.getState().addProject(first)
    useWorkspaceStore.getState().addProject(makeProjectEntry('C:\\work', 'Work'))
    expect(useWorkspaceStore.getState().projects).toHaveLength(1)
  })

  it('toggles a single project expanded state without affecting others', () => {
    useWorkspaceStore.getState().addProject(makeProjectEntry('C:\\work', 'Work'))
    useWorkspaceStore.getState().addProject(makeProjectEntry('C:\\other', 'Other'))
    useWorkspaceStore.getState().toggleProjectExpanded('C:\\work')
    const [work, other] = useWorkspaceStore.getState().projects
    expect(work.isExpanded).toBe(false)
    expect(other.isExpanded).toBe(true)
  })

  it('sets the tree, loading and error state for the matching project only', () => {
    useWorkspaceStore.getState().addProject(makeProjectEntry('C:\\work', 'Work'))
    useWorkspaceStore.getState().addProject(makeProjectEntry('C:\\other', 'Other'))

    useWorkspaceStore.getState().setProjectTreeLoading('C:\\work', true)
    expect(useWorkspaceStore.getState().projects[0].isLoadingTree).toBe(true)
    expect(useWorkspaceStore.getState().projects[1].isLoadingTree).toBe(false)

    const tree = [{ kind: 'file' as const, name: 'a.md', path: 'C:\\work\\a.md', relativePath: 'a.md' }]
    useWorkspaceStore.getState().setProjectTree('C:\\work', tree)
    expect(useWorkspaceStore.getState().projects[0].tree).toEqual(tree)

    useWorkspaceStore.getState().setProjectTreeError('C:\\work', 'boom')
    expect(useWorkspaceStore.getState().projects[0].treeError).toBe('boom')
    expect(useWorkspaceStore.getState().projects[1].treeError).toBeNull()
  })

  it('removing a project closes only its tabs and re-activates a tab from a different project', () => {
    useWorkspaceStore.getState().addProject(makeProjectEntry('C:\\work', 'Work'))
    useWorkspaceStore.getState().addProject(makeProjectEntry('C:\\other', 'Other'))
    useWorkspaceStore.getState().openTab(file, '# First')
    useWorkspaceStore
      .getState()
      .openTab({ name: 'z.md', path: 'C:\\other\\z.md', relativePath: 'z.md', rootPath: 'C:\\other' }, '# Z')
    useWorkspaceStore.getState().activateTab('C:\\other\\z.md')

    useWorkspaceStore.getState().removeProject('C:\\other')

    expect(useWorkspaceStore.getState().projects).toEqual([makeProjectEntry('C:\\work', 'Work')])
    expect(useWorkspaceStore.getState().tabs.map((tab) => tab.path)).toEqual([file.path])
    expect(useWorkspaceStore.getState().activeTabPath).toBe(file.path)
  })
})
