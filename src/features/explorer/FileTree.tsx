import { useState } from 'react'
import type React from 'react'
import type { FileNode } from '../../types/project'

const INDENT_STEP_PX = 16

export interface FileTreeProps {
  nodes: FileNode[]
  activeFilePath: string | null
  onOpenFile: (file: FileNode) => void
  onContextMenu?: (event: React.MouseEvent, node: FileNode) => void
}

export function FileTree({ nodes, activeFilePath, onOpenFile, onContextMenu = () => undefined }: FileTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({})

  function toggleExpanded(path: string) {
    setExpandedPaths((previous) => ({ ...previous, [path]: !previous[path] }))
  }

  function renderNode(node: FileNode, depth: number) {
    const indentStyle = { paddingLeft: `${depth * INDENT_STEP_PX}px` }

    if (node.kind === 'directory') {
      const isExpanded = expandedPaths[node.path] ?? false
      const hasChildren = Boolean(node.children && node.children.length > 0)

      return (
        <li key={node.path} role="treeitem" aria-expanded={isExpanded} onContextMenu={(event) => onContextMenu(event, node)}>
          <button
            type="button"
            className="file-tree__node file-tree__node--directory"
            style={indentStyle}
            onClick={() => toggleExpanded(node.path)}
            title={node.path}
          >
            <span className="file-tree__chevron" aria-hidden="true">
              {isExpanded ? '▾' : '▸'}
            </span>
            <span className="file-tree__label">{node.name}</span>
          </button>
          {isExpanded && hasChildren && (
            <ul className="file-tree__group" role="group">
              {node.children!.map((child) => renderNode(child, depth + 1))}
            </ul>
          )}
        </li>
      )
    }

    const isActive = node.path === activeFilePath

    return (
      <li
        key={node.path}
        role="treeitem"
        aria-current={isActive ? 'page' : undefined}
        onContextMenu={(event) => onContextMenu(event, node)}
      >
        <button
          type="button"
          className={
            isActive
              ? 'file-tree__node file-tree__node--file file-tree__node--active'
              : 'file-tree__node file-tree__node--file'
          }
          style={indentStyle}
          onClick={() => onOpenFile(node)}
          title={node.path}
        >
          <span className="file-tree__icon" aria-hidden="true">
            📄
          </span>
          <span className="file-tree__label">{node.name}</span>
        </button>
      </li>
    )
  }

  if (nodes.length === 0) {
    return <p className="file-tree__empty">Nenhum arquivo Markdown encontrado.</p>
  }

  return (
    <ul className="file-tree" role="tree">
      {nodes.map((node) => renderNode(node, 0))}
    </ul>
  )
}
