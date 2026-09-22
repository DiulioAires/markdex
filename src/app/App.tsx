import { useCallback, useEffect, useRef, useState } from 'react'
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
import { loadWorkspaceSession, saveWorkspaceSession } from '../features/projects/workspace-session'
import { toggleWindowMaximized } from '../lib/window-controls'
import { useSettingsStore } from '../stores/settings-store'
import { findUpdate, installUpdate } from '../features/updates/update-service'

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
    syncOpenFiles,
    syncOpenProjectTrees,
    refreshTree,
    createFile,
    createDirectory,
    renameEntry,
    deleteEntry,
    status,
    error,
  } = useProjectController(api)
  const projects = useWorkspaceStore((state) => state.projects)
  const tabs = useWorkspaceStore((state) => state.tabs)
  const activeTabPath = useWorkspaceStore((state) => state.activeTabPath)
  const viewMode = useWorkspaceStore((state) => state.viewMode)
  const setViewMode = useWorkspaceStore((state) => state.setViewMode)
  const closeTab = useWorkspaceStore((state) => state.closeTab)
  const autosaveEnabled = useSettingsStore((state) => state.autosaveEnabled)
  const automaticUpdates = useSettingsStore((state) => state.automaticUpdates)
  const lastUpdateCheckAt = useSettingsStore((state) => state.lastUpdateCheckAt)
  const setAutomaticUpdates = useSettingsStore((state) => state.setAutomaticUpdates)
  const setLastUpdateCheckAt = useSettingsStore((state) => state.setLastUpdateCheckAt)

  const isOpening = status === 'opening-project'
  const activeTab = tabs.find((tab) => tab.path === activeTabPath) ?? null
  const activeProject = activeTab
    ? projects.find((entry) => entry.info.rootPath === activeTab.rootPath) ?? null
    : null
  const statusBarProjectName =
    activeProject?.info.name ?? (projects.length === 1 ? projects[0].info.name : null)

  const askEntryName = (directory: string, isFolder: boolean) => {
    const name = window.prompt(isFolder ? 'Nome da pasta:' : 'Nome do arquivo Markdown:', isFolder ? '' : 'novo.md')?.trim()
    if (!name) return null
    return `${directory.replace(/[\\/]$/, '')}/${name}`
  }

  const [dismissedError, setDismissedError] = useState<string | null>(null)
  const restoredSession = useRef(false)
  const visibleError = error && error !== dismissedError ? error : null

  const checkForUpdates = useCallback(async (manual = false) => {
    const day = 24 * 60 * 60 * 1000
    if (!manual && (!automaticUpdates || (lastUpdateCheckAt !== null && Date.now() - lastUpdateCheckAt < day))) return
    setLastUpdateCheckAt(Date.now())
    const update = await findUpdate()
    if (!update) {
      if (manual) window.alert('Você já está usando a versão mais recente.')
      return
    }
    if (!window.confirm(`A versão ${update.version} está disponível. Deseja baixar e instalar agora?`)) return
    if (window.confirm('Deseja ativar a busca automática diária por atualizações?')) setAutomaticUpdates(true)
    try {
      await installUpdate(update)
    } catch (caughtError) {
      window.alert(caughtError instanceof Error ? caughtError.message : String(caughtError))
    }
  }, [automaticUpdates, lastUpdateCheckAt, setAutomaticUpdates, setLastUpdateCheckAt])

  useEffect(() => {
    void checkForUpdates()
  }, [checkForUpdates])

  useEffect(() => {
    let cancelled = false
    const roots = loadWorkspaceSession().projectRoots
    void (async () => {
      for (const rootPath of roots) {
        if (cancelled) return
        await openProjectAt(rootPath)
      }
      if (!cancelled) {
        restoredSession.current = true
        saveWorkspaceSession(useWorkspaceStore.getState().projects.map((project) => project.info.rootPath))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [openProjectAt])

  useEffect(() => {
    if (!restoredSession.current) return
    saveWorkspaceSession(projects.map((project) => project.info.rootPath))
  }, [projects])

  // Only one overlay (Settings or the Command Palette) may be open at a time: they share the
  // same backdrop and z-index, so two independent booleans could render both simultaneously
  // (e.g. opening Settings from the ActivityBar, then pressing Ctrl+Shift+P) and fight over
  // focus and the Escape key. A single piece of state makes that impossible by construction.
  const [activeOverlay, setActiveOverlay] = useState<'settings' | 'command-palette' | null>(null)
  const isSettingsOpen = activeOverlay === 'settings'
  const isCommandPaletteOpen = activeOverlay === 'command-palette'
  // Closing an overlay only clears state if that overlay is still the active one. This matters
  // because CommandPalette always calls onClose right after running the selected item: for the
  // "Abrir configurações" item, run() switches activeOverlay to 'settings' first, and a plain
  // setActiveOverlay(null) afterwards would immediately undo that in the same batch.
  const closeOverlayIfActive = (kind: 'settings' | 'command-palette') =>
    setActiveOverlay((current) => (current === kind ? null : current))

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
      run: () => setActiveOverlay('settings'),
    },
  ]

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCommandPaletteShortcut =
        (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p'
      if (isCommandPaletteShortcut) {
        event.preventDefault()
        // Only open when no overlay is already active, so this shortcut can't stack a second
        // modal on top of one the user already opened (matching the mouse behavior, where the
        // ActivityBar sits behind the current overlay's backdrop and can't be clicked).
        setActiveOverlay((current) => current ?? 'command-palette')
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

  useEffect(() => {
    if (!autosaveEnabled || !activeTab?.isDirty) return
    const timer = window.setTimeout(() => {
      void saveActiveFile(true)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [activeTab?.content, activeTab?.isDirty, activeTab?.path, autosaveEnabled, saveActiveFile])

  useEffect(() => {
    if (tabs.length === 0 && projects.length === 0) return
    void syncOpenFiles()
    void syncOpenProjectTrees()
    const timer = window.setInterval(() => {
      void syncOpenFiles()
      void syncOpenProjectTrees()
    }, 1000)
    return () => window.clearInterval(timer)
  }, [projects.length, tabs.length, syncOpenFiles, syncOpenProjectTrees])

  if (projects.length === 0) {
    return (
      <>
        <WelcomeView
          onOpenProject={() => void openProject()}
          isOpening={isOpening}
          onOpenRecentProject={(rootPath) => void openProjectAt(rootPath)}
        />
        {isSettingsOpen ? <SettingsPanel onClose={() => closeOverlayIfActive('settings')} onCheckUpdates={() => void checkForUpdates(true)} /> : null}
        {isCommandPaletteOpen ? (
          <CommandPalette items={commandItems} onClose={() => closeOverlayIfActive('command-palette')} />
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
      onOpenCommandPalette={() => setActiveOverlay('command-palette')}
      onOpenSettings={() => setActiveOverlay('settings')}
      onToggleMaximize={() => void toggleWindowMaximized().catch(() => undefined)}
      explorerSlot={
        <ExplorerColumn
          projects={projects}
          activeFilePath={activeTabPath}
          onOpenFile={(file, rootPath) => void openFile(file, rootPath)}
          onToggleExpand={(rootPath) => useWorkspaceStore.getState().toggleProjectExpanded(rootPath)}
          onRefresh={(rootPath) => void refreshTree(rootPath)}
          onClose={(rootPath) => void closeProject(rootPath)}
          onCreateFile={(rootPath, parentPath) => {
            const path = askEntryName(parentPath ?? rootPath, false)
            if (path) void createFile(rootPath, path)
          }}
          onCreateDirectory={(rootPath, parentPath) => {
            const path = askEntryName(parentPath ?? rootPath, true)
            if (path) void createDirectory(rootPath, path)
          }}
          onRename={(rootPath, node) => {
            const name = window.prompt('Novo nome:', node.name)?.trim()
            if (!name) return
            const separator = Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\'))
            const parent = node.path.slice(0, separator + 1)
            void renameEntry(rootPath, node.path, `${parent}${name}`)
          }}
          onDelete={(rootPath, node) => {
            if (window.confirm(`Apagar ${node.name}?`)) void deleteEntry(rootPath, node.path)
          }}
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
      settingsSlot={isSettingsOpen ? <SettingsPanel onClose={() => closeOverlayIfActive('settings')} onCheckUpdates={() => void checkForUpdates(true)} /> : null}
      commandPaletteSlot={
        isCommandPaletteOpen ? (
          <CommandPalette items={commandItems} onClose={() => closeOverlayIfActive('command-palette')} />
        ) : null
      }
    />
  )
}
