import { AlertTriangle, FileQuestion, RotateCw, X } from 'lucide-react'
import { FileTree } from './FileTree'
import { EmptyState } from '../../components/ui/EmptyState'
import type { FileNode, ProjectEntry } from '../../types/project'

export interface ExplorerPanelProps {
  project: ProjectEntry
  activeFilePath: string | null
  onOpenFile: (file: FileNode) => void
  onToggleExpand: () => void
  onRefresh: () => void
  onClose: () => void
}

export function ExplorerPanel({
  project,
  activeFilePath,
  onOpenFile,
  onToggleExpand,
  onRefresh,
  onClose,
}: ExplorerPanelProps) {
  const { info, tree, isExpanded, isLoadingTree, treeError } = project

  return (
    <div className="explorer-panel">
      <div className="explorer-panel__header">
        <button
          type="button"
          className="explorer-panel__toggle"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          title={info.rootPath}
        >
          <span className="explorer-panel__chevron" aria-hidden="true">
            {isExpanded ? '▾' : '▸'}
          </span>
          <span className="explorer-panel__title">{info.name}</span>
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={onRefresh}
          title="Atualizar árvore de arquivos"
          aria-label={`Atualizar árvore de ${info.name}`}
        >
          <RotateCw size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          title="Fechar projeto"
          aria-label={`Fechar projeto ${info.name}`}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      {isExpanded ? (
        <div className="explorer-panel__body">
          {isLoadingTree ? (
            <div className="loading-skeleton" role="status" aria-label="Carregando árvore de arquivos">
              <span className="loading-skeleton__bar" />
              <span className="loading-skeleton__bar" />
              <span className="loading-skeleton__bar" />
            </div>
          ) : treeError ? (
            <EmptyState
              icon={<AlertTriangle size={24} aria-hidden="true" />}
              title="Não foi possível carregar"
              description={treeError}
              actionLabel="Tentar novamente"
              onAction={onRefresh}
            />
          ) : tree.length === 0 ? (
            <EmptyState
              icon={<FileQuestion size={24} aria-hidden="true" />}
              title="Nenhum arquivo Markdown encontrado"
              description="Adicione arquivos .md a esta pasta e atualize a árvore."
              actionLabel="Atualizar"
              onAction={onRefresh}
            />
          ) : (
            <FileTree nodes={tree} activeFilePath={activeFilePath} onOpenFile={onOpenFile} />
          )}
        </div>
      ) : null}
    </div>
  )
}
