export type ViewMode = 'editor' | 'preview' | 'split'

export interface CursorPosition {
  line: number
  column: number
}

export interface ProjectInfo {
  name: string
  rootPath: string
}

export interface ProjectEntry {
  info: ProjectInfo
  tree: FileNode[]
  isExpanded: boolean
  isLoadingTree: boolean
  treeError: string | null
}

export interface FileNode {
  name: string
  path: string
  relativePath: string
  kind: 'file' | 'directory'
  children?: FileNode[]
}

export interface TabFile {
  name: string
  path: string
  relativePath: string
  rootPath: string
}

export interface DocumentTab extends TabFile {
  savedContent: string
  content: string
  isDirty: boolean
  hasExternalConflict: boolean
  isLoading: boolean
  error: string | null
  cursor: CursorPosition
}
