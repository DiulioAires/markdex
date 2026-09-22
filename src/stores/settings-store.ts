import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type EditorFontSize = 'small' | 'medium' | 'large'

interface SettingsState {
  editorFontSize: EditorFontSize
  autosaveEnabled: boolean
  automaticUpdates: boolean
  lastUpdateCheckAt: number | null
  setEditorFontSize: (size: EditorFontSize) => void
  setAutosaveEnabled: (enabled: boolean) => void
  setAutomaticUpdates: (enabled: boolean) => void
  setLastUpdateCheckAt: (timestamp: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      editorFontSize: 'medium',
      autosaveEnabled: true,
      automaticUpdates: false,
      lastUpdateCheckAt: null,
      setEditorFontSize: (size) => set({ editorFontSize: size }),
      setAutosaveEnabled: (enabled) => set({ autosaveEnabled: enabled }),
      setAutomaticUpdates: (enabled) => set({ automaticUpdates: enabled }),
      setLastUpdateCheckAt: (timestamp) => set({ lastUpdateCheckAt: timestamp }),
    }),
    {
      name: 'markdex:settings',
    },
  ),
)
