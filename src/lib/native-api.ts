import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import type { FileNode, ProjectInfo } from '../types/project'

export interface NativeApi {
  openProject(): Promise<ProjectInfo | null>
  openProjectAt(rootPath: string): Promise<ProjectInfo>
  listTree(rootPath: string): Promise<FileNode[]>
  readFile(rootPath: string, filePath: string): Promise<string>
  writeFile(rootPath: string, filePath: string, content: string): Promise<void>
  createFile?(rootPath: string, filePath: string): Promise<void>
  createDirectory?(rootPath: string, directoryPath: string): Promise<void>
  renameEntry?(rootPath: string, oldPath: string, newPath: string): Promise<void>
  deleteEntry?(rootPath: string, entryPath: string): Promise<void>
  closeProject(rootPath: string): Promise<void>
}

export const nativeApi: NativeApi = {
  openProject: async () => {
    const selectedPath = await open({ directory: true, multiple: false })
    if (typeof selectedPath !== 'string') return null
    return invoke('open_project_at', { rootPath: selectedPath })
  },

  openProjectAt: (rootPath) => invoke('open_project_at', { rootPath }),

  listTree: (rootPath) => invoke('list_markdown_tree', { rootPath }),

  readFile: (rootPath, filePath) =>
    invoke('read_markdown_file', { rootPath, filePath }),

  writeFile: (rootPath, filePath, content) =>
    invoke('write_markdown_file', { rootPath, filePath, content }),

  createFile: (rootPath, filePath) =>
    invoke('create_markdown_file', { rootPath, filePath }),

  createDirectory: (rootPath, directoryPath) =>
    invoke('create_directory', { rootPath, directoryPath }),

  renameEntry: (rootPath, oldPath, newPath) =>
    invoke('rename_entry', { rootPath, oldPath, newPath }),

  deleteEntry: (rootPath, entryPath) =>
    invoke('delete_entry', { rootPath, entryPath }),

  closeProject: (rootPath) => invoke('close_project', { rootPath }),
}
