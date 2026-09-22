import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type EditorFontSize = 'small' | 'medium' | 'large'
export type StartupProject = 'first' | 'last'

interface SettingsState {
  editorFontSize: EditorFontSize
  autosaveEnabled: boolean
  automaticUpdates: boolean
  lastUpdateCheckAt: number | null
  restoreLastSession: boolean
  startupProject: StartupProject
  showRecentFiles: boolean
  setEditorFontSize: (size: EditorFontSize) => void
  setAutosaveEnabled: (enabled: boolean) => void
  setAutomaticUpdates: (enabled: boolean) => void
  setLastUpdateCheckAt: (timestamp: number) => void
  setRestoreLastSession: (enabled: boolean) => void
  setStartupProject: (project: StartupProject) => void
  setShowRecentFiles: (show: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      editorFontSize: 'medium',
      autosaveEnabled: true,
      automaticUpdates: false,
      lastUpdateCheckAt: null,
      restoreLastSession: false,
      startupProject: 'first',
      showRecentFiles: true,
      setEditorFontSize: (size) => set({ editorFontSize: size }),
      setAutosaveEnabled: (enabled) => set({ autosaveEnabled: enabled }),
      setAutomaticUpdates: (enabled) => set({ automaticUpdates: enabled }),
      setLastUpdateCheckAt: (timestamp) => set({ lastUpdateCheckAt: timestamp }),
      setRestoreLastSession: (restoreLastSession) => set({ restoreLastSession }),
      setStartupProject: (startupProject) => set({ startupProject }),
      setShowRecentFiles: (showRecentFiles) => set({ showRecentFiles }),
    }),
    {
      name: 'markdex:settings',
    },
  ),
)
