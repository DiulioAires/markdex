import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { nativeApi } from './native-api'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))

const invokeMock = vi.mocked(invoke)
const dialogOpenMock = vi.mocked(open)

describe('nativeApi', () => {
  beforeEach(() => {
    invokeMock.mockReset()
    dialogOpenMock.mockReset()
  })

  it('opens the native folder picker asynchronously and authorizes the selected project', async () => {
    dialogOpenMock.mockResolvedValue('C:\\work')
    invokeMock.mockResolvedValue({ name: 'work', rootPath: 'C:\\work' })

    await nativeApi.openProject()

    expect(dialogOpenMock).toHaveBeenCalledWith({ directory: true, multiple: false })
    expect(invokeMock).toHaveBeenCalledWith('open_project_at', { rootPath: 'C:\\work' })
  })

  it('does not authorize a project when the folder picker is cancelled', async () => {
    dialogOpenMock.mockResolvedValue(null)

    await expect(nativeApi.openProject()).resolves.toBeNull()
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('openProjectAt invokes open_project_at with rootPath', async () => {
    invokeMock.mockResolvedValue({ id: 'proj-123', name: 'Test Project', rootPath: 'C:\\work' })
    await nativeApi.openProjectAt('C:\\work')
    expect(invokeMock).toHaveBeenCalledWith('open_project_at', { rootPath: 'C:\\work' })
  })

  it('listTree invokes list_markdown_tree with rootPath', async () => {
    invokeMock.mockResolvedValue([])
    await nativeApi.listTree('C:\\work')
    expect(invokeMock).toHaveBeenCalledWith('list_markdown_tree', { rootPath: 'C:\\work' })
  })

  it('readFile invokes read_markdown_file with rootPath and filePath', async () => {
    invokeMock.mockResolvedValue('# Hello')
    await nativeApi.readFile('C:\\work', 'C:\\work\\README.md')
    expect(invokeMock).toHaveBeenCalledWith('read_markdown_file', {
      rootPath: 'C:\\work',
      filePath: 'C:\\work\\README.md',
    })
  })

  it('writeFile invokes write_markdown_file with rootPath, filePath and content', async () => {
    invokeMock.mockResolvedValue(undefined)
    await nativeApi.writeFile('C:\\work', 'C:\\work\\README.md', '# Updated')
    expect(invokeMock).toHaveBeenCalledWith('write_markdown_file', {
      rootPath: 'C:\\work',
      filePath: 'C:\\work\\README.md',
      content: '# Updated',
    })
  })

  it('closeProject invokes close_project with rootPath', async () => {
    invokeMock.mockResolvedValue(undefined)
    await nativeApi.closeProject('C:\\work')
    expect(invokeMock).toHaveBeenCalledWith('close_project', { rootPath: 'C:\\work' })
  })
})
