import { FileTree } from './FileTree'
import type { FileNode } from '../../types/project'

export interface ExplorerPanelProps {
  projectName: string
  nodes: FileNode[]
  activeFilePath: string | null
  onOpenFile: (file: FileNode) => void
  onRefresh: () => void
}

export function ExplorerPanel({
  projectName,
  nodes,
  activeFilePath,
  onOpenFile,
  onRefresh,
}: ExplorerPanelProps) {
  return (
    <div className="explorer-panel">
      <div className="explorer-panel__header">
        <h2 className="explorer-panel__title">{projectName}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onRefresh}
          title="Atualizar árvore de arquivos"
          aria-label="Atualizar árvore de arquivos"
        >
          ⟳
        </button>
      </div>
      <FileTree nodes={nodes} activeFilePath={activeFilePath} onOpenFile={onOpenFile} />
    </div>
  )
}
