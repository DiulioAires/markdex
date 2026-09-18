import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { useWorkspaceStore } from '../stores/workspace-store'
import type { NativeApi } from '../lib/native-api'
import type { FileNode, ProjectInfo } from '../types/project'

const project: ProjectInfo = { name: 'Notes', rootPath: 'C:\\projects\\notes' }

const readmeNode: FileNode = {
  kind: 'file',
  name: 'README.md',
  path: 'C:\\projects\\notes\\README.md',
  relativePath: 'README.md',
}

const apiNode: FileNode = {
  kind: 'file',
  name: 'api.md',
  path: 'C:\\projects\\notes\\docs\\api.md',
  relativePath: 'docs/api.md',
}

const docsNode: FileNode = {
  kind: 'directory',
  name: 'docs',
  path: 'C:\\projects\\notes\\docs',
  relativePath: 'docs',
  children: [apiNode],
}

const tree: FileNode[] = [readmeNode, docsNode]

interface InMemoryFile {
  content: string
}

function createInMemoryApi(overrides: Partial<NativeApi> = {}): NativeApi {
  const files = new Map<string, InMemoryFile>([
    [readmeNode.path, { content: '# Notes\n' }],
    [apiNode.path, { content: '# API\n' }],
  ])

  return {
    openProject: vi.fn().mockResolvedValue(project),
    listTree: vi.fn().mockResolvedValue(tree),
    readFile: vi.fn(async (_rootPath: string, filePath: string) => {
      const file = files.get(filePath)
      if (!file) throw new Error(`unknown file: ${filePath}`)
      return file.content
    }),
    writeFile: vi.fn(async (_rootPath: string, filePath: string, content: string) => {
      const file = files.get(filePath)
      if (!file) throw new Error(`unknown file: ${filePath}`)
      file.content = content
    }),
    closeProject: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('App integration journey', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().reset()
  })

  it('opens a project, edits a nested file, switches to preview, and saves', async () => {
    const user = userEvent.setup()
    const api = createInMemoryApi()

    render(<App api={api} />)

    await user.click(screen.getByRole('button', { name: /abrir projeto/i }))

    await waitFor(() => expect(api.listTree).toHaveBeenCalledWith(project.rootPath))
    expect(await screen.findByText('docs')).toBeInTheDocument()

    await user.click(screen.getByText('docs'))
    const nestedFile = await screen.findByText('api.md')
    await user.click(nestedFile)

    await waitFor(() => expect(api.readFile).toHaveBeenCalledWith(project.rootPath, apiNode.path))

    const editor = await screen.findByRole('textbox')
    await user.click(editor)
    await user.type(editor, ' Extra content')

    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled())

    await user.click(screen.getByRole('button', { name: 'Preview' }))

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(api.writeFile).toHaveBeenCalled())
    const [savedRoot, savedPath, savedContent] = (api.writeFile as ReturnType<typeof vi.fn>).mock
      .calls[0]
    expect(savedRoot).toBe(project.rootPath)
    expect(savedPath).toBe(apiNode.path)
    expect(savedContent).toContain('Extra content')

    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled())
    expect(screen.getByText('Salvo')).toBeInTheDocument()
  })

  it('keeps the buffer and shows a visible error when saving fails', async () => {
    const user = userEvent.setup()
    const writeFile = vi.fn().mockRejectedValue(new Error('disco cheio'))
    const api = createInMemoryApi({ writeFile })

    render(<App api={api} />)

    await user.click(screen.getByRole('button', { name: /abrir projeto/i }))
    await screen.findByText('README.md')
    await user.click(screen.getByText('README.md'))

    const editor = await screen.findByRole('textbox')
    await user.click(editor)
    await user.type(editor, ' more text')

    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled())

    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    const toast = await screen.findByRole('alert')
    expect(within(toast).getByText(/disco cheio/i)).toBeInTheDocument()

    expect(useWorkspaceStore.getState().tabs[0].isDirty).toBe(true)
    expect(useWorkspaceStore.getState().tabs[0].content).toContain('more text')
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
  })

  it('opens two different projects side by side, each keeping its own tabs when the other is closed', async () => {
    const user = userEvent.setup()
    const secondProject: ProjectInfo = { name: 'Blog', rootPath: 'C:\\projects\\blog' }
    const postNode: FileNode = {
      kind: 'file',
      name: 'post.md',
      path: 'C:\\projects\\blog\\post.md',
      relativePath: 'post.md',
    }
    const api = createInMemoryApi({
      openProject: vi
        .fn()
        .mockResolvedValueOnce(project)
        .mockResolvedValueOnce(secondProject),
      listTree: vi
        .fn()
        .mockResolvedValueOnce(tree)
        .mockResolvedValueOnce([postNode]),
      readFile: vi.fn().mockResolvedValue('# Post'),
    })

    render(<App api={api} />)

    await user.click(screen.getByRole('button', { name: /abrir projeto/i }))
    await screen.findByText('README.md')

    await user.click(screen.getByText('README.md'))
    await screen.findByRole('textbox')

    await user.click(screen.getByRole('button', { name: /abrir projeto/i }))
    await screen.findByText('post.md')

    expect(screen.getAllByText('README.md').length).toBeGreaterThan(0)
    expect(screen.getByText('post.md')).toBeInTheDocument()

    await user.click(screen.getByText('post.md'))
    await screen.findByRole('textbox')

    await user.click(screen.getByRole('button', { name: 'Fechar projeto Blog' }))

    const tablist = screen.getByRole('tablist')
    expect(within(tablist).queryByText('post.md')).not.toBeInTheDocument()
    expect(within(tablist).getByText('README.md')).toBeInTheDocument()
  })
})
