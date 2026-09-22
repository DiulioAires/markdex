import { beforeEach, describe, expect, it } from 'vitest'
import { readSession, writeSession } from './session-store'

describe('session store', () => {
  beforeEach(() => localStorage.clear())

  it('falls back to an empty session when storage is invalid', () => {
    localStorage.setItem('markdex:session', '{invalid')
    expect(readSession()).toEqual({
      projects: [],
      activeProjectRootPath: null,
      activeFilePath: null,
    })
  })

  it('round trips the persisted project order and active file', () => {
    writeSession({
      projects: [{ name: 'Docs', rootPath: 'C:/docs' }],
      activeProjectRootPath: 'C:/docs',
      activeFilePath: 'C:/docs/README.md',
    })
    expect(readSession()).toEqual({
      projects: [{ name: 'Docs', rootPath: 'C:/docs' }],
      activeProjectRootPath: 'C:/docs',
      activeFilePath: 'C:/docs/README.md',
    })
  })
})
