import { useCallback, useState } from 'react'
import { nativeApi as defaultNativeApi, type NativeApi } from '../../lib/native-api'
import { useWorkspaceStore } from '../../stores/workspace-store'
import type { FileNode, TabFile } from '../../types/project'

export type ProjectControllerStatus = 'idle' | 'opening-project' | 'opening-file' | 'saving'

function toTabFile(file: FileNode): TabFile {
  return { name: file.name, path: file.path, relativePath: file.relativePath }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function useProjectController(api: NativeApi = defaultNativeApi) {
  const [status, setStatus] = useState<ProjectControllerStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [tree, setTree] = useState<FileNode[]>([])

  const setProject = useWorkspaceStore((state) => state.setProject)
  const openTab = useWorkspaceStore((state) => state.openTab)
  const activateTab = useWorkspaceStore((state) => state.activateTab)
  const markSaved = useWorkspaceStore((state) => state.markSaved)

  const openProject = useCallback(async () => {
    setStatus('opening-project')
    setError(null)
    try {
      const project = await api.openProject()
      if (!project) {
        return
      }
      const nextTree = await api.listTree(project.rootPath)
      setProject(project)
      setTree(nextTree)
    } catch (caughtError) {
      setError(errorMessage(caughtError))
    } finally {
      setStatus('idle')
    }
  }, [api, setProject])

  const refreshTree = useCallback(async () => {
    const { project } = useWorkspaceStore.getState()
    if (!project) {
      return
    }

    setError(null)
    try {
      const nextTree = await api.listTree(project.rootPath)
      setTree(nextTree)
    } catch (caughtError) {
      setError(errorMessage(caughtError))
    }
  }, [api])

  const openFile = useCallback(
    async (file: FileNode) => {
      const existingTab = useWorkspaceStore
        .getState()
        .tabs.some((tab) => tab.path === file.path)

      if (existingTab) {
        activateTab(file.path)
        return
      }

      const { rootPath } = useWorkspaceStore.getState().project ?? {}
      if (!rootPath) {
        setError('No project is open')
        return
      }

      setStatus('opening-file')
      setError(null)
      try {
        const content = await api.readFile(rootPath, file.path)
        openTab(toTabFile(file), content)
      } catch (caughtError) {
        setError(errorMessage(caughtError))
      } finally {
        setStatus('idle')
      }
    },
    [api, activateTab, openTab],
  )

  const saveActiveFile = useCallback(async () => {
    const { project, tabs, activeTabPath } = useWorkspaceStore.getState()
    const activeTab = tabs.find((tab) => tab.path === activeTabPath)

    if (!project || !activeTab) {
      return
    }

    setStatus('saving')
    setError(null)
    try {
      await api.writeFile(project.rootPath, activeTab.path, activeTab.content)
      markSaved(activeTab.path)
    } catch (caughtError) {
      setError(errorMessage(caughtError))
    } finally {
      setStatus('idle')
    }
  }, [api, markSaved])

  return { openProject, openFile, saveActiveFile, status, error, tree, refreshTree }
}
