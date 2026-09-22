import type { FileNode } from '../../types/project'

export type FileSortKey = 'name' | 'modifiedAt' | 'path'
export type SortDirection = 'asc' | 'desc'

export interface CatalogFile extends FileNode {
  kind: 'file'
  modifiedAt: number | null
}

export function flattenMarkdownFiles(nodes: FileNode[]): CatalogFile[] {
  const files: CatalogFile[] = []
  for (const node of nodes) {
    if (node.kind === 'file') {
      files.push({
        name: node.name,
        path: node.path,
        relativePath: node.relativePath,
        kind: 'file',
        modifiedAt: node.modifiedAt ?? null,
      })
    } else if (node.children) {
      files.push(...flattenMarkdownFiles(node.children))
    }
  }
  return files
}

export function filterAndSortFiles(
  files: CatalogFile[],
  query: string,
  sortKey: FileSortKey,
  direction: SortDirection,
): CatalogFile[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filtered = files.filter((file) => {
    if (!normalizedQuery) return true
    return `${file.name} ${file.relativePath}`.toLocaleLowerCase().includes(normalizedQuery)
  })

  return [...filtered].sort((left, right) => {
    let comparison = 0
    if (sortKey === 'modifiedAt') {
      comparison = (left.modifiedAt ?? 0) - (right.modifiedAt ?? 0)
    } else if (sortKey === 'path') {
      comparison = left.relativePath.localeCompare(right.relativePath)
    } else {
      comparison = left.name.localeCompare(right.name)
    }
    return direction === 'asc' ? comparison : -comparison
  })
}
