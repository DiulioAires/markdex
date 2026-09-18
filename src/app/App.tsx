import { useEffect, useState } from 'react'
import { AppShell } from './AppShell'
import { WelcomeView } from '../features/projects/WelcomeView'
import { useProjectController } from '../features/projects/use-project-controller'
import { ExplorerColumn } from '../features/explorer/ExplorerColumn'
import { EditorWorkspace } from '../features/editor/EditorWorkspace'
import { Toast } from '../components/ui/Toast'
import { useWorkspaceStore } from '../stores/workspace-store'
import type { NativeApi } from '../lib/native-api'

export interface AppProps {
  api?: NativeApi
}

export function App({ api }: AppProps = {}) {
  const { openProject, openFile, closeProject, saveActiveFile, refreshTree, status, error } =
    useProjectController(api)
  const projects = useWorkspaceStore((state) => state.projects)
  const tabs = useWorkspaceStore((state) => state.tabs)
  const activeTabPath = useWorkspaceStore((state) => state.activeTabPath)
  const viewMode = useWorkspaceStore((state) => state.viewMode)
  const setViewMode = useWorkspaceStore((state) => state.setViewMode)

  const isOpening = status === 'opening-project'
  const activeTab = tabs.find((tab) => tab.path === activeTabPath) ?? null
  const activeProject = activeTab
    ? projects.find((entry) => entry.info.rootPath === activeTab.rootPath) ?? null
    : null
  const statusBarProjectName =
    activeProject?.info.name ?? (projects.length === 1 ? projects[0].info.name : null)

  const [dismissedError, setDismissedError] = useState<string | null>(null)
  const visibleError = error && error !== dismissedError ? error : null

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isOpenShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o'
      if (isOpenShortcut) {
        event.preventDefault()
        if (!isOpening) {
          void openProject()
        }
        return
      }

      const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's'
      if (!isSaveShortcut) return
      const { activeTabPath: currentActiveTabPath } = useWorkspaceStore.getState()
      if (!currentActiveTabPath) return
      event.preventDefault()
      void saveActiveFile()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openProject, saveActiveFile, isOpening])

  if (projects.length === 0) {
    return <WelcomeView onOpenProject={() => void openProject()} isOpening={isOpening} />
  }

  return (
    <AppShell
      viewMode={viewMode}
      onSelectViewMode={setViewMode}
      onOpenProject={() => void openProject()}
      isOpening={isOpening}
      projectName={statusBarProjectName}
      fileType={activeTab ? activeTab.name.split('.').pop() ?? null : null}
      cursor={activeTab ? activeTab.cursor : null}
      isDirty={activeTab?.isDirty ?? false}
      isSaving={status === 'saving'}
      onSave={() => void saveActiveFile()}
      explorerSlot={
        <ExplorerColumn
          projects={projects}
          activeFilePath={activeTabPath}
          onOpenFile={(file, rootPath) => void openFile(file, rootPath)}
          onToggleExpand={(rootPath) => useWorkspaceStore.getState().toggleProjectExpanded(rootPath)}
          onRefresh={(rootPath) => void refreshTree(rootPath)}
          onClose={(rootPath) => void closeProject(rootPath)}
        />
      }
      workspaceSlot={
        <>
          {status === 'opening-file' ? (
            <div className="loading-skeleton" role="status" aria-label="Carregando arquivo">
              <span className="loading-skeleton__bar" />
              <span className="loading-skeleton__bar" />
              <span className="loading-skeleton__bar" />
            </div>
          ) : null}
          <EditorWorkspace
            tabs={tabs}
            activeTab={activeTab}
            activeTabPath={activeTabPath}
            projects={projects}
          />
        </>
      }
      toastSlot={
        visibleError ? <Toast message={visibleError} onDismiss={() => setDismissedError(error)} /> : null
      }
    />
  )
}
