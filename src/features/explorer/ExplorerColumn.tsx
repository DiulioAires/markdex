import { ExplorerPanel } from './ExplorerPanel'
import type { FileNode, ProjectEntry } from '../../types/project'

export interface ExplorerColumnProps {
  projects: ProjectEntry[]
  activeFilePath: string | null
  onOpenFile: (file: FileNode, rootPath: string) => void
  onToggleExpand: (rootPath: string) => void
  onRefresh: (rootPath: string) => void
  onClose: (rootPath: string) => void
}

export function ExplorerColumn({
  projects,
  activeFilePath,
  onOpenFile,
  onToggleExpand,
  onRefresh,
  onClose,
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
        />
      ))}
    </div>
  )
}
