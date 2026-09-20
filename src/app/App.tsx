import { useEffect, useState } from 'react'
import { AppShell } from './AppShell'
import { WelcomeView } from '../features/projects/WelcomeView'
import { useProjectController } from '../features/projects/use-project-controller'
import { ExplorerColumn } from '../features/explorer/ExplorerColumn'
import { EditorWorkspace } from '../features/editor/EditorWorkspace'
import { Toast } from '../components/ui/Toast'
import { SettingsPanel } from '../features/settings/SettingsPanel'
import { CommandPalette } from '../features/command-palette/CommandPalette'
import type { CommandItem } from '../features/command-palette/commands'
import { useWorkspaceStore } from '../stores/workspace-store'
import type { NativeApi } from '../lib/native-api'

export interface AppProps {
  api?: NativeApi
}

export function App({ api }: AppProps = {}) {
  const {
    openProject,
    openProjectAt,
    openFile,
    closeProject,
    saveActiveFile,
    refreshTree,
    status,
    error,
  } = useProjectController(api)
  const projects = useWorkspaceStore((state) => state.projects)
  const tabs = useWorkspaceStore((state) => state.tabs)
  const activeTabPath = useWorkspaceStore((state) => state.activeTabPath)
  const viewMode = useWorkspaceStore((state) => state.viewMode)
  const setViewMode = useWorkspaceStore((state) => state.setViewMode)
  const closeTab = useWorkspaceStore((state) => state.closeTab)

  const isOpening = status === 'opening-project'
  const activeTab = tabs.find((tab) => tab.path === activeTabPath) ?? null
  const activeProject = activeTab
    ? projects.find((entry) => entry.info.rootPath === activeTab.rootPath) ?? null
    : null
  const statusBarProjectName =
    activeProject?.info.name ?? (projects.length === 1 ? projects[0].info.name : null)

  const [dismissedError, setDismissedError] = useState<string | null>(null)
  const visibleError = error && error !== dismissedError ? error : null

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const commandItems: CommandItem[] = [
    {
      id: 'open-project',
      label: 'Abrir projeto',
      shortcut: 'Ctrl+O',
      run: () => void openProject(),
    },
    {
      id: 'save-file',
      label: 'Salvar arquivo',
      shortcut: 'Ctrl+S',
      disabled: !activeTab || !activeTab.isDirty,
      run: () => void saveActiveFile(),
    },
    {
      id: 'view-editor',
      label: 'Modo Editor',
      disabled: projects.length === 0,
      run: () => setViewMode('editor'),
    },
    {
      id: 'view-preview',
      label: 'Modo Visualização',
      disabled: projects.length === 0,
      run: () => setViewMode('preview'),
    },
    {
      id: 'view-split',
      label: 'Modo Dividido',
      disabled: projects.length === 0,
      run: () => setViewMode('split'),
    },
    {
      id: 'close-active-tab',
      label: 'Fechar aba atual',
      disabled: !activeTabPath,
      run: () => {
        if (activeTabPath) closeTab(activeTabPath)
      },
    },
    {
      id: 'open-settings',
      label: 'Abrir configurações',
      run: () => setIsSettingsOpen(true),
    },
  ]

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCommandPaletteShortcut =
        (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p'
      if (isCommandPaletteShortcut) {
        event.preventDefault()
        setIsCommandPaletteOpen(true)
        return
      }

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
    return (
      <>
        <WelcomeView
          onOpenProject={() => void openProject()}
          isOpening={isOpening}
          onOpenRecentProject={(rootPath) => void openProjectAt(rootPath)}
        />
        {isSettingsOpen ? <SettingsPanel onClose={() => setIsSettingsOpen(false)} /> : null}
        {isCommandPaletteOpen ? (
          <CommandPalette items={commandItems} onClose={() => setIsCommandPaletteOpen(false)} />
        ) : null}
      </>
    )
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
      onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      onOpenSettings={() => setIsSettingsOpen(true)}
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
      settingsSlot={isSettingsOpen ? <SettingsPanel onClose={() => setIsSettingsOpen(false)} /> : null}
      commandPaletteSlot={
        isCommandPaletteOpen ? (
          <CommandPalette items={commandItems} onClose={() => setIsCommandPaletteOpen(false)} />
        ) : null
      }
    />
  )
}
