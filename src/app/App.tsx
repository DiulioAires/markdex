import { useEffect, useRef, useState } from 'react'
import { AppShell } from './AppShell'
import { WelcomeView } from '../features/projects/WelcomeView'
import { useProjectController } from '../features/projects/use-project-controller'
import type { ProjectControllerStatus } from '../features/projects/use-project-controller'
import { ExplorerPanel } from '../features/explorer/ExplorerPanel'
import { EditorWorkspace } from '../features/editor/EditorWorkspace'
import { EmptyState } from '../components/ui/EmptyState'
import { Toast } from '../components/ui/Toast'
import { useWorkspaceStore } from '../stores/workspace-store'
import type { NativeApi } from '../lib/native-api'

export interface AppProps {
  api?: NativeApi
}

export function App({ api }: AppProps = {}) {
  const { openProject, openFile, saveActiveFile, status, error, tree, refreshTree } =
    useProjectController(api)
  const project = useWorkspaceStore((state) => state.project)
  const tabs = useWorkspaceStore((state) => state.tabs)
  const activeTabPath = useWorkspaceStore((state) => state.activeTabPath)
  const viewMode = useWorkspaceStore((state) => state.viewMode)
  const setViewMode = useWorkspaceStore((state) => state.setViewMode)

  const isOpening = status === 'opening-project'
  const activeTab = tabs.find((tab) => tab.path === activeTabPath) ?? null

  // The controller reports every failure through a single `error` field. To
  // show save failures as a non-destructive toast (keeping the editor intact)
  // while still showing tree/file load failures as an inline, retryable
  // panel, track which status preceded the current error.
  const previousStatusRef = useRef<ProjectControllerStatus>(status)
  const [errorSource, setErrorSource] = useState<'save' | 'other' | null>(null)

  useEffect(() => {
    if (error) {
      setErrorSource(previousStatusRef.current === 'saving' ? 'save' : 'other')
    } else {
      setErrorSource(null)
    }
    previousStatusRef.current = status
  }, [status, error])

  const saveErrorToast = errorSource === 'save' ? error : null
  const workspaceError = errorSource === 'other' ? error : null

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isOpenShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o'
      if (isOpenShortcut) {
        event.preventDefault()
        void openProject()
        return
      }

      const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's'
      if (!isSaveShortcut) return
      const { activeTabPath } = useWorkspaceStore.getState()
      if (!activeTabPath) return
      event.preventDefault()
      void saveActiveFile()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openProject, saveActiveFile])

  if (!project) {
    return <WelcomeView onOpenProject={() => void openProject()} isOpening={isOpening} />
  }

  const isTreeEmpty = tree.length === 0 && !workspaceError

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
      onSave={() => void saveActiveFile()}
      explorerSlot={
        isTreeEmpty ? (
          <EmptyState
            title="Nenhum arquivo Markdown encontrado"
            description="Adicione arquivos .md a esta pasta e atualize a árvore."
            actionLabel="Atualizar"
            onAction={() => void refreshTree()}
          />
        ) : (
          <ExplorerPanel
            projectName={project.name}
            nodes={tree}
            activeFilePath={activeTabPath}
            onOpenFile={(file) => void openFile(file)}
            onRefresh={() => void refreshTree()}
          />
        )
      }
      workspaceSlot={
        workspaceError ? (
          <EmptyState
            title="Não foi possível carregar"
            description={workspaceError}
            actionLabel="Tentar novamente"
            onAction={() => void refreshTree()}
          />
        ) : (
          <>
            {status === 'opening-file' ? (
              <div className="loading-skeleton" role="status" aria-label="Carregando arquivo">
                <span className="loading-skeleton__bar" />
                <span className="loading-skeleton__bar" />
                <span className="loading-skeleton__bar" />
              </div>
            ) : null}
            <EditorWorkspace tabs={tabs} activeTab={activeTab} activeTabPath={activeTabPath} />
          </>
        )
      }
      toastSlot={
        saveErrorToast ? (
          <Toast message={saveErrorToast} onDismiss={() => setErrorSource(null)} />
        ) : null
      }
    />
  )
}
