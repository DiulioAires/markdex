import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspaceStore } from './workspace-store'

const file = { name: 'README.md', path: 'C:\\work\\README.md', relativePath: 'README.md' }

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
    const second = { name: 'api.md', path: 'C:\\work\\api.md', relativePath: 'api.md' }
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
    const second = { name: 'api.md', path: 'C:\\work\\api.md', relativePath: 'api.md' }
    useWorkspaceStore.getState().openTab(file, '# First')
    useWorkspaceStore.getState().openTab(second, '# API')
    useWorkspaceStore.getState().activateTab(file.path)
    useWorkspaceStore.getState().setViewMode('split')
    expect(useWorkspaceStore.getState().activeTabPath).toBe(file.path)
    expect(useWorkspaceStore.getState().viewMode).toBe('split')
    expect(useWorkspaceStore.getState().tabs).toHaveLength(2)
  })

  it('stores the current project', () => {
    const project = { name: 'Docs', rootPath: 'C:\\work' }
    useWorkspaceStore.getState().setProject(project)
    expect(useWorkspaceStore.getState().project).toEqual(project)
  })
})
