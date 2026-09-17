import { useEffect } from 'react'
import { AppShell } from './AppShell'
import { WelcomeView } from '../features/projects/WelcomeView'
import { useProjectController } from '../features/projects/use-project-controller'
import { useWorkspaceStore } from '../stores/workspace-store'

export function App() {
  const { openProject, status, error } = useProjectController()
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
      explorerSlot={<p className="explorer-placeholder">Árvore de arquivos em breve.</p>}
      workspaceSlot={
        error ? (
          <p role="alert" className="workspace-placeholder workspace-placeholder--error">
            {error}
          </p>
        ) : (
          <p className="workspace-placeholder">Selecione um arquivo para começar a editar.</p>
        )
      }
    />
  )
}
