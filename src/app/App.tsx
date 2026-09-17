import { useEffect } from 'react'
import { AppShell } from './AppShell'
import { WelcomeView } from '../features/projects/WelcomeView'
import { useProjectController } from '../features/projects/use-project-controller'
import { ExplorerPanel } from '../features/explorer/ExplorerPanel'
import { EditorWorkspace } from '../features/editor/EditorWorkspace'
import { useWorkspaceStore } from '../stores/workspace-store'

export function App() {
  const { openProject, openFile, status, error, tree, refreshTree } = useProjectController()
  const project = useWorkspaceStore((state) => state.project)
  const tabs = useWorkspaceStore((state) => state.tabs)
  const activeTabPath = useWorkspaceStore((state) => state.activeTabPath)
  const viewMode = useWorkspaceStore((state) => state.viewMode)
  const setViewMode = useWorkspaceStore((state) => state.setViewMode)

  const isOpening = status === 'opening-project'
  const activeTab = tabs.find((tab) => tab.path === activeTabPath) ?? null

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isOpenShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o'
      if (!isOpenShortcut) return
      event.preventDefault()
      void openProject()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openProject])

  if (!project) {
    return <WelcomeView onOpenProject={() => void openProject()} isOpening={isOpening} />
  }

  return (
    <AppShell
      viewMode={viewMode}
      onSelectViewMode={setViewMode}
      onOpenProject={() => void openProject()}
      isOpening={isOpening}
      projectName={project.name}
      fileType={activeTab ? activeTab.name.split('.').pop() ?? null : null}
      cursor={activeTab ? activeTab.cursor : null}
      isDirty={activeTab?.isDirty ?? false}
      isSaving={status === 'saving'}
      explorerSlot={
        <ExplorerPanel
          projectName={project.name}
          nodes={tree}
          activeFilePath={activeTabPath}
          onOpenFile={(file) => void openFile(file)}
          onRefresh={() => void refreshTree()}
        />
      }
      workspaceSlot={
        error ? (
          <p role="alert" className="workspace-placeholder workspace-placeholder--error">
            {error}
          </p>
        ) : (
          <EditorWorkspace tabs={tabs} activeTab={activeTab} activeTabPath={activeTabPath} />
        )
      }
    />
  )
}
