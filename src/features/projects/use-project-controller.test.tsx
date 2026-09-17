import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkspaceStore } from '../../stores/workspace-store'
import type { NativeApi } from '../../lib/native-api'
import { useProjectController } from './use-project-controller'
import type { FileNode, ProjectInfo } from '../../types/project'

const project: ProjectInfo = { name: 'Docs', rootPath: 'C:\\work' }
const readme: FileNode = {
  kind: 'file',
  name: 'README.md',
  path: 'C:\\work\\README.md',
  relativePath: 'README.md',
}

function createFakeApi(overrides: Partial<NativeApi> = {}): NativeApi {
  return {
    openProject: vi.fn().mockResolvedValue(project),
    listTree: vi.fn().mockResolvedValue([readme]),
    readFile: vi.fn().mockResolvedValue('# Hello'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('useProjectController', () => {
  beforeEach(() => useWorkspaceStore.getState().reset())

  it('opens a project and stores the project and its tree', async () => {
    const api = createFakeApi()
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
    })

    expect(useWorkspaceStore.getState().project).toEqual(project)
    expect(api.listTree).toHaveBeenCalledWith(project.rootPath)
    expect(result.current.status).toBe('idle')
    expect(result.current.error).toBeNull()
  })

  it('does not store a project or tree when the user cancels the dialog', async () => {
    const api = createFakeApi({ openProject: vi.fn().mockResolvedValue(null) })
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
    })

    expect(useWorkspaceStore.getState().project).toBeNull()
    expect(api.listTree).not.toHaveBeenCalled()
  })

  it('opens a file by reading it once, and reuses the tab on a second open', async () => {
    const api = createFakeApi()
    const { result } = renderHook(() => useProjectController(api))

    await act(async () => {
      await result.current.openProject()
    })
    await act(async () => {
      await result.current.openFile(readme)
    })
    await act(async () => {
      await result.current.openFile(readme)
    })

    expect(api.readFile).toHaveBeenCalledTimes(1)
    expect(useWorkspaceStore.getState().tabs).toHaveLength(1)
    expect(useWorkspaceStore.getState().tabs[0].content).toBe('# Hello')
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
      await result.current.openFile(readme)
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
      await result.current.openFile(readme)
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
})
