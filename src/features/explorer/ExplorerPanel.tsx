import { AlertTriangle, FileQuestion, FolderPlus, Plus, RotateCw, X } from 'lucide-react'
import { useState } from 'react'
import type React from 'react'
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
  onCreateFile?: (parentPath?: string) => void
  onCreateDirectory?: (parentPath?: string) => void
  onRename?: (node: FileNode) => void
  onDelete?: (node: FileNode) => void
  onSelect?: () => void
  onMove?: (targetIndex: number) => void
  projectIndex?: number
}

export function ExplorerPanel({
  project,
  activeFilePath,
  onOpenFile,
  onToggleExpand,
  onRefresh,
  onClose,
  onCreateFile = () => undefined,
  onCreateDirectory = () => undefined,
  onRename = () => undefined,
  onDelete = () => undefined,
  onSelect,
  onMove,
  projectIndex,
}: ExplorerPanelProps) {
  const { info, tree, isExpanded, isLoadingTree, treeError } = project
  const [menu, setMenu] = useState<{ node: FileNode; x: number; y: number } | null>(null)
  const contextMenu = (event: React.MouseEvent, node: FileNode) => {
    event.preventDefault()
    setMenu({ node, x: event.clientX, y: event.clientY })
  }

  return (
    <div className="explorer-panel">
      <div
        className="explorer-panel__header"
        draggable
        onClick={() => onSelect?.()}
        onDragStart={(event) => event.dataTransfer.setData('text/markdex-project-index', String(projectIndex ?? -1))}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const sourceIndex = Number(event.dataTransfer.getData('text/markdex-project-index'))
          if (Number.isInteger(sourceIndex) && sourceIndex !== projectIndex && projectIndex !== undefined) onMove?.(projectIndex)
        }}
        title="Arraste para reordenar projetos"
      >
        <button
          type="button"
          className="explorer-panel__toggle"
          onClick={(event) => { event.stopPropagation(); onSelect?.(); onToggleExpand() }}
          aria-expanded={isExpanded}
          title={info.rootPath}
        >
          <span className="explorer-panel__chevron" aria-hidden="true">
            {isExpanded ? '▾' : '▸'}
          </span>
          <span className="explorer-panel__title">{info.name}</span>
        </button>
        <button type="button" className="icon-button" onClick={(event) => { event.stopPropagation(); onCreateFile() }} title="Criar arquivo Markdown" aria-label="Criar arquivo Markdown"><Plus size={16} /></button>
        <button type="button" className="icon-button" onClick={(event) => { event.stopPropagation(); onCreateDirectory() }} title="Criar pasta" aria-label="Criar pasta"><FolderPlus size={16} /></button>
        <button
          type="button"
          className="icon-button"
          onClick={(event) => { event.stopPropagation(); onSelect?.(); onRefresh() }}
          title="Atualizar árvore de arquivos"
          aria-label={`Atualizar árvore de ${info.name}`}
        >
          <RotateCw size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={(event) => { event.stopPropagation(); onClose() }}
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
            <FileTree nodes={tree} activeFilePath={activeFilePath} onOpenFile={onOpenFile} onContextMenu={contextMenu} />
          )}
        </div>
      ) : null}
      {menu ? (
        <div className="file-tree__context-menu" style={{ left: menu.x, top: menu.y }} role="menu" onMouseLeave={() => setMenu(null)}>
          {menu.node.kind === 'directory' ? <>
            <button type="button" onClick={() => { setMenu(null); onCreateFile(menu.node.path) }}>Novo arquivo</button>
            <button type="button" onClick={() => { setMenu(null); onCreateDirectory(menu.node.path) }}>Nova pasta</button>
          </> : null}
          <button type="button" onClick={() => { setMenu(null); onRename(menu.node) }}>Renomear</button>
          <button type="button" onClick={() => { setMenu(null); onDelete(menu.node) }}>Apagar</button>
        </div>
      ) : null}
    </div>
  )
}
