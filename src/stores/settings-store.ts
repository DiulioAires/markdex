import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type EditorFontSize = 'small' | 'medium' | 'large'
export type StartupProject = 'first' | 'last'
export type SessionStartupMode = 'ask' | 'restore' | 'empty'

interface SettingsState {
  editorFontSize: EditorFontSize
  autosaveEnabled: boolean
  automaticUpdates: boolean
  lastUpdateCheckAt: number | null
  sessionStartupMode: SessionStartupMode
  startupProject: StartupProject
  showRecentFiles: boolean
  setEditorFontSize: (size: EditorFontSize) => void
  setAutosaveEnabled: (enabled: boolean) => void
  setAutomaticUpdates: (enabled: boolean) => void
  setLastUpdateCheckAt: (timestamp: number) => void
  setSessionStartupMode: (mode: SessionStartupMode) => void
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
      sessionStartupMode: 'ask',
      startupProject: 'first',
      showRecentFiles: true,
      setEditorFontSize: (size) => set({ editorFontSize: size }),
      setAutosaveEnabled: (enabled) => set({ autosaveEnabled: enabled }),
      setAutomaticUpdates: (enabled) => set({ automaticUpdates: enabled }),
      setLastUpdateCheckAt: (timestamp) => set({ lastUpdateCheckAt: timestamp }),
      setSessionStartupMode: (sessionStartupMode) => set({ sessionStartupMode }),
      setStartupProject: (startupProject) => set({ startupProject }),
      setShowRecentFiles: (showRecentFiles) => set({ showRecentFiles }),
    }),
    {
      name: 'markdex:settings',
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          const { restoreLastSession, ...state } = persistedState as Partial<SettingsState> & {
            restoreLastSession?: boolean
          }
          return {
            ...state,
            sessionStartupMode: restoreLastSession === true ? 'restore' : 'ask',
          }
        }
        return persistedState as SettingsState
      },
    },
  ),
)
