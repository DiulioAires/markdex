import { create } from 'zustand'
import type {
  CursorPosition,
  DocumentTab,
  ProjectInfo,
  TabFile,
  ViewMode,
} from '../types/project'

interface WorkspaceState {
  project: ProjectInfo | null
  tabs: DocumentTab[]
  activeTabPath: string | null
  viewMode: ViewMode
  setProject: (project: ProjectInfo | null) => void
  openTab: (file: TabFile, content: string) => void
  activateTab: (path: string) => void
  updateBuffer: (path: string, content: string) => void
  updateCursor: (path: string, cursor: CursorPosition) => void
  markSaved: (path: string) => void
  closeTab: (path: string) => void
  setViewMode: (viewMode: ViewMode) => void
  reset: () => void
}

const initialState = {
  project: null,
  tabs: [],
  activeTabPath: null,
  viewMode: 'editor' as ViewMode,
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  ...initialState,

  setProject: (project) => set({ project }),

  openTab: (file, content) =>
    set((state) => {
      const existingTab = state.tabs.some((tab) => tab.path === file.path)

      return {
        tabs: existingTab
          ? state.tabs
          : [
              ...state.tabs,
              {
                ...file,
                savedContent: content,
                content,
                isDirty: false,
                isLoading: false,
                error: null,
                cursor: { line: 1, column: 1 },
              },
            ],
        activeTabPath: file.path,
      }
    }),

  activateTab: (path) =>
    set((state) =>
      state.tabs.some((tab) => tab.path === path) ? { activeTabPath: path } : state,
    ),

  updateBuffer: (path, content) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.path === path
          ? { ...tab, content, isDirty: content !== tab.savedContent }
          : tab,
      ),
    })),

  updateCursor: (path, cursor) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.path === path ? { ...tab, cursor } : tab)),
    })),

  markSaved: (path) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.path === path ? { ...tab, savedContent: tab.content, isDirty: false } : tab,
      ),
    })),

  closeTab: (path) =>
    set((state) => {
      const closingIndex = state.tabs.findIndex((tab) => tab.path === path)
      if (closingIndex === -1) return state

      const tabs = state.tabs.filter((tab) => tab.path !== path)
      if (state.activeTabPath !== path) return { tabs }

      const nextActiveTab = tabs[closingIndex - 1] ?? tabs[closingIndex] ?? null
      return { tabs, activeTabPath: nextActiveTab?.path ?? null }
    }),

  setViewMode: (viewMode) => set({ viewMode }),

  reset: () => set({ ...initialState, tabs: [] }),
}))
