import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type EditorFontSize = 'small' | 'medium' | 'large'

interface SettingsState {
  editorFontSize: EditorFontSize
  setEditorFontSize: (size: EditorFontSize) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      editorFontSize: 'medium',
      setEditorFontSize: (size) => set({ editorFontSize: size }),
    }),
    {
      name: 'md-project-manager:settings',
    },
  ),
)
