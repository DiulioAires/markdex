import { useCallback, useState } from 'react'
import { nativeApi as defaultNativeApi, type NativeApi } from '../../lib/native-api'
import { useWorkspaceStore } from '../../stores/workspace-store'
import type { FileNode, ProjectInfo, TabFile } from '../../types/project'

export type ProjectControllerStatus = 'idle' | 'opening-project' | 'opening-file' | 'saving'

function toTabFile(file: FileNode, rootPath: string): TabFile {
  return { name: file.name, path: file.path, relativePath: file.relativePath, rootPath }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function useProjectController(api: NativeApi = defaultNativeApi) {
  const [status, setStatus] = useState<ProjectControllerStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const addProject = useWorkspaceStore((state) => state.addProject)
  const removeProject = useWorkspaceStore((state) => state.removeProject)
  const toggleProjectExpanded = useWorkspaceStore((state) => state.toggleProjectExpanded)
  const setProjectTree = useWorkspaceStore((state) => state.setProjectTree)
  const setProjectTreeLoading = useWorkspaceStore((state) => state.setProjectTreeLoading)
  const setProjectTreeError = useWorkspaceStore((state) => state.setProjectTreeError)
  const openTab = useWorkspaceStore((state) => state.openTab)
  const activateTab = useWorkspaceStore((state) => state.activateTab)
  const markSaved = useWorkspaceStore((state) => state.markSaved)

  const registerProject = useCallback(
    async (info: ProjectInfo) => {
      const existing = useWorkspaceStore
        .getState()
        .projects.find((entry) => entry.info.rootPath === info.rootPath)
      if (existing) {
        if (!existing.isExpanded) {
          toggleProjectExpanded(info.rootPath)
        }
        return
      }

      addProject({
        info,
        tree: [],
        isExpanded: true,
        isLoadingTree: true,
        treeError: null,
      })

      try {
        const tree = await api.listTree(info.rootPath)
        setProjectTree(info.rootPath, tree)
      } catch (caughtError) {
        setProjectTreeError(info.rootPath, errorMessage(caughtError))
      } finally {
        setProjectTreeLoading(info.rootPath, false)
      }
    },
    [api, addProject, toggleProjectExpanded, setProjectTree, setProjectTreeError, setProjectTreeLoading],
  )

  const openProject = useCallback(async () => {
    setStatus('opening-project')
    setError(null)
    try {
      const info = await api.openProject()
      if (!info) {
        return
      }
      await registerProject(info)
    } catch (caughtError) {
      setError(errorMessage(caughtError))
    } finally {
      setStatus('idle')
    }
  }, [api, registerProject])

  const openRecentProject = useCallback(
    async (rootPath: string) => {
      setStatus('opening-project')
      setError(null)
      try {
        const info = await api.openProjectAt(rootPath)
        await registerProject(info)
      } catch (caughtError) {
        setError(errorMessage(caughtError))
      } finally {
        setStatus('idle')
      }
    },
    [api, registerProject],
  )

  const closeProject = useCallback(
    async (rootPath: string) => {
      try {
        await api.closeProject(rootPath)
      } catch (caughtError) {
        setError(errorMessage(caughtError))
        return
      }
      removeProject(rootPath)
    },
    [api, removeProject],
  )

  const refreshTree = useCallback(
    async (rootPath: string) => {
      const exists = useWorkspaceStore
        .getState()
        .projects.some((entry) => entry.info.rootPath === rootPath)
      if (!exists) {
        return
      }

      setProjectTreeError(rootPath, null)
      setProjectTreeLoading(rootPath, true)
      try {
        const tree = await api.listTree(rootPath)
        setProjectTree(rootPath, tree)
      } catch (caughtError) {
        setProjectTreeError(rootPath, errorMessage(caughtError))
      } finally {
        setProjectTreeLoading(rootPath, false)
      }
    },
    [api, setProjectTree, setProjectTreeError, setProjectTreeLoading],
  )

  const openFile = useCallback(
    async (file: FileNode, rootPath: string) => {
      const existingTab = useWorkspaceStore
        .getState()
        .tabs.some((tab) => tab.path === file.path)

      if (existingTab) {
        activateTab(file.path)
        return
      }

      setStatus('opening-file')
      setError(null)
      try {
        const content = await api.readFile(rootPath, file.path)
        openTab(toTabFile(file, rootPath), content)
      } catch (caughtError) {
        setError(errorMessage(caughtError))
      } finally {
        setStatus('idle')
      }
    },
    [api, activateTab, openTab],
  )

  const saveActiveFile = useCallback(async () => {
    const { tabs, activeTabPath } = useWorkspaceStore.getState()
    const activeTab = tabs.find((tab) => tab.path === activeTabPath)

    if (!activeTab) {
      return
    }

    setStatus('saving')
    setError(null)
    try {
      await api.writeFile(activeTab.rootPath, activeTab.path, activeTab.content)
      markSaved(activeTab.path)
    } catch (caughtError) {
      setError(errorMessage(caughtError))
    } finally {
      setStatus('idle')
    }
  }, [api, markSaved])

  return {
    openProject,
    openRecentProject,
    openFile,
    closeProject,
    saveActiveFile,
    refreshTree,
    status,
    error,
  }
}
