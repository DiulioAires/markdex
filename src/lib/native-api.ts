import { invoke } from '@tauri-apps/api/core'
import type { FileNode, ProjectInfo } from '../types/project'

export interface NativeApi {
  openProject(): Promise<ProjectInfo | null>
  listTree(rootPath: string): Promise<FileNode[]>
  readFile(rootPath: string, filePath: string): Promise<string>
  writeFile(rootPath: string, filePath: string, content: string): Promise<void>
  closeProject(rootPath: string): Promise<void>
}

export const nativeApi: NativeApi = {
  openProject: () => invoke('open_project'),

  listTree: (rootPath) => invoke('list_markdown_tree', { rootPath }),

  readFile: (rootPath, filePath) =>
    invoke('read_markdown_file', { rootPath, filePath }),

  writeFile: (rootPath, filePath, content) =>
    invoke('write_markdown_file', { rootPath, filePath, content }),

  closeProject: (rootPath) => invoke('close_project', { rootPath }),
}
