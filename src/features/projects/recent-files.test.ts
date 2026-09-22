import { beforeEach, describe, expect, it } from 'vitest'
import { getRecentFiles, recordRecentFile } from './recent-files'

describe('recent files', () => {
  beforeEach(() => localStorage.clear())

  it('records saved files newest first and scopes them by project', () => {
    recordRecentFile({
      name: 'README.md',
      path: 'C:/work/README.md',
      relativePath: 'README.md',
      rootPath: 'C:/work',
    })
    recordRecentFile({
      name: 'Other.md',
      path: 'C:/other/Other.md',
      relativePath: 'Other.md',
      rootPath: 'C:/other',
    })

    expect(getRecentFiles().map((file) => file.path)).toEqual([
      'C:/other/Other.md',
      'C:/work/README.md',
    ])
    expect(getRecentFiles('C:/work').map((file) => file.path)).toEqual(['C:/work/README.md'])
  })
})
