import { create } from 'zustand'
import type {
  CursorPosition,
  DocumentTab,
  FileNode,
  ProjectEntry,
  TabFile,
  ViewMode,
} from '../types/project'

interface WorkspaceState {
  projects: ProjectEntry[]
  tabs: DocumentTab[]
  activeTabPath: string | null
  activeProjectRootPath: string | null
  viewMode: ViewMode
  addProject: (entry: ProjectEntry) => void
  moveProject: (rootPath: string, targetIndex: number) => void
  setActiveProject: (rootPath: string | null) => void
  removeProject: (rootPath: string) => void
  toggleProjectExpanded: (rootPath: string) => void
  setProjectTree: (rootPath: string, tree: FileNode[]) => void
  setProjectTreeLoading: (rootPath: string, isLoading: boolean) => void
  setProjectTreeError: (rootPath: string, error: string | null) => void
  openTab: (file: TabFile, content: string) => void
  activateTab: (path: string) => void
  updateBuffer: (path: string, content: string) => void
  updateExternalContent: (path: string, content: string) => void
  markExternalConflict: (path: string) => void
  clearExternalConflict: (path: string) => void
  updateCursor: (path: string, cursor: CursorPosition) => void
  markSaved: (path: string) => void
  renamePath: (oldPath: string, newPath: string) => void
  closeTabsUnderPath: (path: string) => void
  closeTab: (path: string) => void
  setViewMode: (viewMode: ViewMode) => void
  reset: () => void
}

const initialState = {
  projects: [] as ProjectEntry[],
  tabs: [] as DocumentTab[],
  activeTabPath: null as string | null,
  activeProjectRootPath: null as string | null,
  viewMode: 'editor' as ViewMode,
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...initialState,

  addProject: (entry) =>
    set((state) => {
      const alreadyOpen = state.projects.some((project) => project.info.rootPath === entry.info.rootPath)
      return alreadyOpen ? state : { projects: [...state.projects, entry] }
    }),

  moveProject: (rootPath, targetIndex) =>
    set((state) => {
      const currentIndex = state.projects.findIndex((project) => project.info.rootPath === rootPath)
      if (currentIndex === -1) return state
      const projects = [...state.projects]
      const [project] = projects.splice(currentIndex, 1)
      const boundedIndex = Math.max(0, Math.min(targetIndex, projects.length))
      projects.splice(boundedIndex, 0, project)
      return { projects }
    }),

  setActiveProject: (activeProjectRootPath) => set({ activeProjectRootPath }),

  removeProject: (rootPath) => {
    get()
      .tabs.filter((tab) => tab.rootPath === rootPath)
      .forEach((tab) => get().closeTab(tab.path))

    set((state) => ({
      projects: state.projects.filter((project) => project.info.rootPath !== rootPath),
      activeProjectRootPath:
        state.activeProjectRootPath === rootPath ? null : state.activeProjectRootPath,
    }))
  },

  toggleProjectExpanded: (rootPath) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.info.rootPath === rootPath
          ? { ...project, isExpanded: !project.isExpanded }
          : project,
      ),
    })),

  setProjectTree: (rootPath, tree) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.info.rootPath === rootPath ? { ...project, tree } : project,
      ),
    })),

  setProjectTreeLoading: (rootPath, isLoadingTree) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.info.rootPath === rootPath ? { ...project, isLoadingTree } : project,
      ),
    })),

  setProjectTreeError: (rootPath, treeError) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.info.rootPath === rootPath ? { ...project, treeError } : project,
      ),
    })),

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
                hasExternalConflict: false,
                isLoading: false,
                error: null,
                cursor: { line: 1, column: 1 },
              },
            ],
        activeTabPath: file.path,
        activeProjectRootPath: file.rootPath,
      }
    }),

  activateTab: (path) =>
    set((state) => {
      const tab = state.tabs.find((candidate) => candidate.path === path)
      return tab ? { activeTabPath: path, activeProjectRootPath: tab.rootPath } : state
    }),

  updateBuffer: (path, content) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.path === path
          ? { ...tab, content, isDirty: content !== tab.savedContent }
          : tab,
      ),
    })),

  updateExternalContent: (path, content) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.path === path
          ? { ...tab, content, savedContent: content, isDirty: false, hasExternalConflict: false }
          : tab,
      ),
    })),

  markExternalConflict: (path) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.path === path ? { ...tab, hasExternalConflict: true } : tab,
      ),
    })),

  clearExternalConflict: (path) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.path === path ? { ...tab, hasExternalConflict: false } : tab,
      ),
    })),

  updateCursor: (path, cursor) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.path === path ? { ...tab, cursor } : tab)),
    })),

  markSaved: (path) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.path === path
          ? { ...tab, savedContent: tab.content, isDirty: false, hasExternalConflict: false }
          : tab,
      ),
    })),

  renamePath: (oldPath, newPath) =>
    set((state) => {
      const replace = (value: string) => value === oldPath ? newPath : value.startsWith(`${oldPath}/`) || value.startsWith(`${oldPath}\\`) ? `${newPath}${value.slice(oldPath.length)}` : value
      return {
        tabs: state.tabs.map((tab) => ({
          ...tab,
          path: replace(tab.path),
          name: tab.path === oldPath ? newPath.split(/[\\/]/).pop() ?? tab.name : tab.name,
          relativePath: replace(tab.relativePath),
        })),
        activeTabPath: state.activeTabPath ? replace(state.activeTabPath) : null,
      }
    }),

  closeTabsUnderPath: (path) =>
    set((state) => {
      const isUnder = (value: string) => value === path || value.startsWith(`${path}/`) || value.startsWith(`${path}\\`)
      const tabs = state.tabs.filter((tab) => !isUnder(tab.path))
      const activeClosed = state.activeTabPath ? isUnder(state.activeTabPath) : false
      return { tabs, activeTabPath: activeClosed ? tabs[0]?.path ?? null : state.activeTabPath }
    }),

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

  reset: () => set({ ...initialState, projects: [], tabs: [] }),
}))
