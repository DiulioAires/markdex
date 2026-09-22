import { useCallback, useState } from 'react'
import { nativeApi as defaultNativeApi, type NativeApi } from '../../lib/native-api'
import { useWorkspaceStore } from '../../stores/workspace-store'
import { addRecentProject, removeRecentProject } from './recent-projects'
import { recordRecentFile } from './recent-files'
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
  const updateExternalContent = useWorkspaceStore((state) => state.updateExternalContent)
  const markExternalConflict = useWorkspaceStore((state) => state.markExternalConflict)
  const renamePath = useWorkspaceStore((state) => state.renamePath)
  const closeTabsUnderPath = useWorkspaceStore((state) => state.closeTabsUnderPath)
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject)

  const registerProject = useCallback(
    async (info: ProjectInfo) => {
      addRecentProject({ name: info.name, rootPath: info.rootPath })
      setActiveProject(info.rootPath)

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
    [api, addProject, setActiveProject, toggleProjectExpanded, setProjectTree, setProjectTreeError, setProjectTreeLoading],
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

  const openProjectAt = useCallback(
    async (rootPath: string) => {
      setStatus('opening-project')
      setError(null)
      try {
        const info = await api.openProjectAt(rootPath)
        await registerProject(info)
      } catch (caughtError) {
        setError(errorMessage(caughtError))
        removeRecentProject(rootPath)
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
    async (rootPath: string, options: { background?: boolean } = {}) => {
      const project = useWorkspaceStore
        .getState()
        .projects.find((entry) => entry.info.rootPath === rootPath)
      if (!project || project.isLoadingTree) {
        return
      }

      if (!options.background) {
        setProjectTreeError(rootPath, null)
        setProjectTreeLoading(rootPath, true)
      }
      try {
        const tree = await api.listTree(rootPath)
        setProjectTree(rootPath, tree)
      } catch (caughtError) {
        if (!options.background) {
          setProjectTreeError(rootPath, errorMessage(caughtError))
        }
      } finally {
        if (!options.background) {
          setProjectTreeLoading(rootPath, false)
        }
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

  const saveActiveFile = useCallback(async (automatic = false) => {
    const { tabs, activeTabPath } = useWorkspaceStore.getState()
    const activeTab = tabs.find((tab) => tab.path === activeTabPath)

    if (!activeTab) {
      return
    }

    if (automatic && activeTab.hasExternalConflict) {
      setError('O arquivo foi alterado externamente. Salve manualmente para confirmar a sobrescrita.')
      return
    }

    setStatus('saving')
    setError(null)
    const wasDirty = activeTab.isDirty
    try {
      await api.writeFile(activeTab.rootPath, activeTab.path, activeTab.content)
      markSaved(activeTab.path)
      if (wasDirty) {
        recordRecentFile({ name: activeTab.name, path: activeTab.path, relativePath: activeTab.relativePath, rootPath: activeTab.rootPath })
      }
    } catch (caughtError) {
      setError(errorMessage(caughtError))
    } finally {
      setStatus('idle')
    }
  }, [api, markSaved])

  const syncOpenFiles = useCallback(async () => {
    const tabs = useWorkspaceStore.getState().tabs
    await Promise.all(
      tabs.map(async (tab) => {
        try {
          const diskContent = await api.readFile(tab.rootPath, tab.path)
          if (diskContent === tab.savedContent) return
          if (tab.isDirty) {
            markExternalConflict(tab.path)
            setError(`Conflito detectado em ${tab.name}: o arquivo foi alterado externamente.`)
          } else {
            updateExternalContent(tab.path, diskContent)
          }
        } catch {
          // The regular save/open flows surface actionable errors; background sync stays quiet.
        }
      }),
    )
  }, [api, markExternalConflict, updateExternalContent])

  const createFile = useCallback(async (rootPath: string, filePath: string) => {
    try {
      if (!api.createFile) throw new Error('Criação de arquivos não está disponível.')
      await api.createFile(rootPath, filePath)
      await refreshTree(rootPath)
      return true
    } catch (caughtError) {
      setError(errorMessage(caughtError))
      return false
    }
  }, [api, refreshTree])

  const createDirectory = useCallback(async (rootPath: string, directoryPath: string) => {
    try {
      if (!api.createDirectory) throw new Error('Criação de pastas não está disponível.')
      await api.createDirectory(rootPath, directoryPath)
      await refreshTree(rootPath)
      return true
    } catch (caughtError) {
      setError(errorMessage(caughtError))
      return false
    }
  }, [api, refreshTree])

  const renameEntry = useCallback(async (rootPath: string, oldPath: string, newPath: string) => {
    try {
      if (!api.renameEntry) throw new Error('Renomeação não está disponível.')
      await api.renameEntry(rootPath, oldPath, newPath)
      renamePath(oldPath, newPath)
      await refreshTree(rootPath)
      return true
    } catch (caughtError) {
      setError(errorMessage(caughtError))
      return false
    }
  }, [api, refreshTree, renamePath])

  const deleteEntry = useCallback(async (rootPath: string, entryPath: string) => {
    try {
      if (!api.deleteEntry) throw new Error('Exclusão não está disponível.')
      await api.deleteEntry(rootPath, entryPath)
      closeTabsUnderPath(entryPath)
      await refreshTree(rootPath)
      return true
    } catch (caughtError) {
      setError(errorMessage(caughtError))
      return false
    }
  }, [api, closeTabsUnderPath, refreshTree])

  return {
    openProject,
    openProjectAt,
    openFile,
    closeProject,
    saveActiveFile,
    syncOpenFiles,
    refreshTree,
    createFile,
    createDirectory,
    renameEntry,
    deleteEntry,
    status,
    error,
  }
}
