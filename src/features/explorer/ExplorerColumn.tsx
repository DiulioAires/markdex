import { ExplorerPanel } from './ExplorerPanel'
import type { FileNode, ProjectEntry } from '../../types/project'

export interface ExplorerColumnProps {
  projects: ProjectEntry[]
  activeFilePath: string | null
  onOpenFile: (file: FileNode, rootPath: string) => void
  onToggleExpand: (rootPath: string) => void
  onRefresh: (rootPath: string) => void
  onClose: (rootPath: string) => void
  onCreateFile?: (rootPath: string, parentPath?: string) => void
  onCreateDirectory?: (rootPath: string, parentPath?: string) => void
  onRename?: (rootPath: string, node: FileNode) => void
  onDelete?: (rootPath: string, node: FileNode) => void
}

export function ExplorerColumn({
  projects,
  activeFilePath,
  onOpenFile,
  onToggleExpand,
  onRefresh,
  onClose,
  onCreateFile = () => undefined,
  onCreateDirectory = () => undefined,
  onRename = () => undefined,
  onDelete = () => undefined,
}: ExplorerColumnProps) {
  return (
    <div className="explorer-column">
      {projects.map((project) => (
        <ExplorerPanel
          key={project.info.rootPath}
          project={project}
          activeFilePath={activeFilePath}
          onOpenFile={(file) => onOpenFile(file, project.info.rootPath)}
          onToggleExpand={() => onToggleExpand(project.info.rootPath)}
          onRefresh={() => onRefresh(project.info.rootPath)}
          onClose={() => onClose(project.info.rootPath)}
          onCreateFile={(parentPath) => onCreateFile(project.info.rootPath, parentPath)}
          onCreateDirectory={(parentPath) => onCreateDirectory(project.info.rootPath, parentPath)}
          onRename={(node) => onRename(project.info.rootPath, node)}
          onDelete={(node) => onDelete(project.info.rootPath, node)}
        />
      ))}
    </div>
  )
}
