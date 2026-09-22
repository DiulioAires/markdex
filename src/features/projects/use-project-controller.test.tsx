import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkspaceStore } from '../../stores/workspace-store'
import type { NativeApi } from '../../lib/native-api'
import { useProjectController } from './use-project-controller'
import { addRecentProject, getRecentProjects } from './recent-projects'
import type { FileNode, ProjectInfo } from '../../types/project'

const project: ProjectInfo = { name: 'Docs', rootPath: 'C:\\work' }
const otherProject: ProjectInfo = { name: 'Other', rootPath: 'C:\\other' }
const readme: FileNode = {
  kind: 'file',
  name: 'README.md',
  path: 'C:\\work\\README.md',
  relativePath: 'README.md',
}

function createFakeApi(overrides: Partial<NativeApi> = {}): NativeApi {
  return {
    openProject: vi.fn().mockResolvedValue(project),
    openProjectAt: vi.fn().mockResolvedValue(project),
    listTree: vi.fn().mockResolvedValue([readme]),
    readFile: vi.fn().mockResolvedValue('# Hello'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    closeProject: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('useProjectController', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().reset()
    localStorage.clear()
  })

  it('opens a project and stores it, expanded, with its tree', async () => {
    const api = createFakeApi()
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
    })

    const [entry] = useWorkspaceStore.getState().projects
    expect(entry.info).toEqual(project)
    expect(entry.isExpanded).toBe(true)
    expect(entry.isLoadingTree).toBe(false)
    expect(entry.tree).toEqual([readme])
    expect(api.listTree).toHaveBeenCalledWith(project.rootPath)
    expect(result.current.status).toBe('idle')
    expect(result.current.error).toBeNull()
  })

  it('opening the same project twice does not duplicate it or re-fetch its tree', async () => {
    const api = createFakeApi()
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
    })
    await act(async () => {
      await result.current.openProject()
    })

    expect(useWorkspaceStore.getState().projects).toHaveLength(1)
    expect(api.listTree).toHaveBeenCalledTimes(1)
  })

  it('opening a second, different project keeps the first one untouched', async () => {
    const api = createFakeApi({
      openProject: vi
        .fn()
        .mockResolvedValueOnce(project)
        .mockResolvedValueOnce(otherProject),
    })
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
    })
    await act(async () => {
      await result.current.openProject()
    })

    const roots = useWorkspaceStore.getState().projects.map((entry) => entry.info.rootPath)
    expect(roots).toEqual([project.rootPath, otherProject.rootPath])
  })

  it('does not store a project or tree when the user cancels the dialog', async () => {
    const api = createFakeApi({ openProject: vi.fn().mockResolvedValue(null) })
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
    })

    expect(useWorkspaceStore.getState().projects).toEqual([])
    expect(api.listTree).not.toHaveBeenCalled()
  })

  it('openProjectAt opens a project by rootPath and stores it, expanded, with its tree', async () => {
    const api = createFakeApi()
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProjectAt(project.rootPath)
    })

    expect(api.openProjectAt).toHaveBeenCalledWith(project.rootPath)
    const [entry] = useWorkspaceStore.getState().projects
    expect(entry.info).toEqual(project)
    expect(entry.isExpanded).toBe(true)
    expect(entry.tree).toEqual([readme])
    expect(api.listTree).toHaveBeenCalledWith(project.rootPath)
    expect(result.current.status).toBe('idle')
    expect(result.current.error).toBeNull()
  })

  it('opening the same project twice via openProjectAt does not duplicate it or re-fetch its tree', async () => {
    const api = createFakeApi()
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProjectAt(project.rootPath)
    })
    await act(async () => {
      await result.current.openProjectAt(project.rootPath)
    })

    expect(useWorkspaceStore.getState().projects).toHaveLength(1)
    expect(api.listTree).toHaveBeenCalledTimes(1)
  })

  it('exposes the error when openProjectAt is rejected and does not store a project', async () => {
    const api = createFakeApi({
      openProjectAt: vi.fn().mockRejectedValue(new Error('pasta não encontrada')),
    })
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProjectAt('C:\\missing')
    })

    expect(useWorkspaceStore.getState().projects).toEqual([])
    expect(result.current.error).toBe('pasta não encontrada')
    expect(result.current.status).toBe('idle')
  })

  it('adds the project to recents when opened via openProject or openProjectAt', async () => {
    const api = createFakeApi({ openProjectAt: vi.fn().mockResolvedValue(otherProject) })
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
    })

    expect(getRecentProjects().map((entry) => entry.rootPath)).toEqual([project.rootPath])

    await act(async () => {
      await result.current.openProjectAt(otherProject.rootPath)
    })

    expect(getRecentProjects().map((entry) => entry.rootPath)).toEqual([
      otherProject.rootPath,
      project.rootPath,
    ])
  })

  it('removes the stale recent entry when openProjectAt fails', async () => {
    // Seed a pre-existing recent entry for the path that is about to fail, plus another
    // unrelated one, so the assertion below actually exercises removeRecentProject instead of
    // trivially passing on an already-empty list.
    addRecentProject({ name: 'Missing', rootPath: 'C:\\missing' })
    addRecentProject({ name: 'Other', rootPath: otherProject.rootPath })
    expect(getRecentProjects().map((entry) => entry.rootPath)).toEqual([
      otherProject.rootPath,
      'C:\\missing',
    ])

    const api = createFakeApi({
      openProjectAt: vi.fn().mockRejectedValue(new Error('pasta não encontrada')),
    })
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProjectAt('C:\\missing')
    })

    expect(getRecentProjects().map((entry) => entry.rootPath)).toEqual([otherProject.rootPath])
  })

  it('closeProject calls the native api and removes the project from the store', async () => {
    const api = createFakeApi()
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
    })
    await act(async () => {
      await result.current.closeProject(project.rootPath)
    })

    expect(api.closeProject).toHaveBeenCalledWith(project.rootPath)
    expect(useWorkspaceStore.getState().projects).toEqual([])
  })

  it('keeps the project in the store and exposes the error when closeProject is rejected', async () => {
    const api = createFakeApi({
      closeProject: vi.fn().mockRejectedValue(new Error('root not open')),
    })
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
    })
    await act(async () => {
      await result.current.closeProject(project.rootPath)
    })

    expect(useWorkspaceStore.getState().projects).toHaveLength(1)
    expect(useWorkspaceStore.getState().projects[0].info).toEqual(project)
    expect(result.current.error).toBe('root not open')
  })

  it('refreshes the tree for the given project only', async () => {
    const updatedTree: FileNode[] = [
      readme,
      { kind: 'file', name: 'CHANGELOG.md', path: 'C:\\work\\CHANGELOG.md', relativePath: 'CHANGELOG.md' },
    ]
    const listTree = vi.fn().mockResolvedValueOnce([readme]).mockResolvedValueOnce(updatedTree)
    const api = createFakeApi({ listTree })
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
    })
    await act(async () => {
      await result.current.refreshTree(project.rootPath)
    })

    expect(listTree).toHaveBeenCalledTimes(2)
    expect(useWorkspaceStore.getState().projects[0].tree).toEqual(updatedTree)
  })

  it('does nothing when refreshTree targets a project that is not open', async () => {
    const api = createFakeApi()
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.refreshTree('C:\\unknown')
    })

    expect(api.listTree).not.toHaveBeenCalled()
  })

  it('refreshes every open project tree when syncing external project state', async () => {
    const newFile: FileNode = {
      kind: 'file',
      name: 'NEW.md',
      path: 'C:\\work\\NEW.md',
      relativePath: 'NEW.md',
    }
    const listTree = vi.fn().mockResolvedValueOnce([readme]).mockResolvedValueOnce([readme, newFile])
    const api = createFakeApi({ listTree })
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
      await result.current.syncOpenProjectTrees()
    })

    expect(useWorkspaceStore.getState().projects[0].tree).toEqual([readme, newFile])
    expect(listTree).toHaveBeenCalledTimes(2)
  })

  it('opens a file by reading it once, and reuses the tab on a second open', async () => {
    const api = createFakeApi()
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
    })
    await act(async () => {
      await result.current.openFile(readme, project.rootPath)
    })
    await act(async () => {
      await result.current.openFile(readme, project.rootPath)
    })

    expect(api.readFile).toHaveBeenCalledTimes(1)
    expect(useWorkspaceStore.getState().tabs).toHaveLength(1)
    expect(useWorkspaceStore.getState().tabs[0].content).toBe('# Hello')
    expect(useWorkspaceStore.getState().tabs[0].rootPath).toBe(project.rootPath)
    expect(useWorkspaceStore.getState().activeTabPath).toBe(readme.path)
  })

  it('marks a tab clean only after the save promise resolves', async () => {
    let resolveWrite: () => void = () => {}
    const writePromise = new Promise<void>((resolve) => {
      resolveWrite = resolve
    })
    const api = createFakeApi({ writeFile: vi.fn().mockReturnValue(writePromise) })
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
    })
    await act(async () => {
      await result.current.openFile(readme, project.rootPath)
    })

    act(() => {
      useWorkspaceStore.getState().updateBuffer(readme.path, '# Changed')
    })
    expect(useWorkspaceStore.getState().tabs[0].isDirty).toBe(true)

    let savePromise!: Promise<void>
    act(() => {
      savePromise = result.current.saveActiveFile()
    })
    expect(useWorkspaceStore.getState().tabs[0].isDirty).toBe(true)

    resolveWrite()
    await act(async () => {
      await savePromise
    })

    expect(useWorkspaceStore.getState().tabs[0].isDirty).toBe(false)
    expect(api.writeFile).toHaveBeenCalledWith(project.rootPath, readme.path, '# Changed')
  })

  it('preserves dirty content and exposes the error text when saving fails', async () => {
    const api = createFakeApi({
      writeFile: vi.fn().mockRejectedValue(new Error('disk is full')),
    })
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
    })
    await act(async () => {
      await result.current.openFile(readme, project.rootPath)
    })
    act(() => {
      useWorkspaceStore.getState().updateBuffer(readme.path, '# Changed')
    })

    await act(async () => {
      await result.current.saveActiveFile()
    })

    await waitFor(() => expect(result.current.error).toBe('disk is full'))
    expect(useWorkspaceStore.getState().tabs[0].isDirty).toBe(true)
    expect(useWorkspaceStore.getState().tabs[0].content).toBe('# Changed')
  })

  it('reloads clean tabs when the file changes outside Markdex', async () => {
    const api = createFakeApi({ readFile: vi.fn().mockResolvedValueOnce('# Hello').mockResolvedValueOnce('# External') })
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
      await result.current.openFile(readme, project.rootPath)
      await result.current.syncOpenFiles()
    })

    expect(useWorkspaceStore.getState().tabs[0].content).toBe('# External')
    expect(useWorkspaceStore.getState().tabs[0].isDirty).toBe(false)
  })

  it('preserves local edits and marks a conflict when the file changes externally', async () => {
    const api = createFakeApi({ readFile: vi.fn().mockResolvedValueOnce('# Hello').mockResolvedValueOnce('# External') })
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
      await result.current.openFile(readme, project.rootPath)
    })
    act(() => {
      useWorkspaceStore.getState().updateBuffer(readme.path, '# Local')
    })

    await act(async () => {
      await result.current.syncOpenFiles()
    })

    const tab = useWorkspaceStore.getState().tabs[0]
    expect(tab.content).toBe('# Local')
    expect(tab.isDirty).toBe(true)
    expect(tab.hasExternalConflict).toBe(true)
  })
})
