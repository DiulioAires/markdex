import { describe, expect, it } from 'vitest'
import { filterAndSortFiles, flattenMarkdownFiles } from './file-catalog'

const tree = [
  {
    kind: 'directory' as const,
    name: 'docs',
    path: 'C:/docs',
    relativePath: 'docs',
    children: [
      {
        kind: 'file' as const,
        name: 'zeta.md',
        path: 'C:/docs/zeta.md',
        relativePath: 'docs/zeta.md',
        modifiedAt: 10,
      },
    ],
  },
  {
    kind: 'file' as const,
    name: 'alpha.md',
    path: 'C:/alpha.md',
    relativePath: 'alpha.md',
    modifiedAt: null,
  },
]

describe('file catalog', () => {
  it('flattens nested files and normalizes unavailable modification dates', () => {
    expect(flattenMarkdownFiles(tree).map((file) => [file.name, file.modifiedAt])).toEqual([
      ['zeta.md', 10],
      ['alpha.md', null],
    ])
  })

  it('filters by name or relative path and sorts by the selected key', () => {
    const files = flattenMarkdownFiles(tree)
    expect(filterAndSortFiles(files, 'docs', 'path', 'asc').map((file) => file.name)).toEqual([
      'zeta.md',
    ])
    expect(filterAndSortFiles(files, '', 'name', 'asc').map((file) => file.name)).toEqual([
      'alpha.md',
      'zeta.md',
    ])
    expect(filterAndSortFiles(files, '', 'modifiedAt', 'desc').map((file) => file.name)).toEqual([
      'zeta.md',
      'alpha.md',
    ])
  })
})
