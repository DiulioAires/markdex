import { fireEvent, render, screen } from '@testing-library/react'
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

function createApi(overrides: Partial<NativeApi> = {}): NativeApi {
  return {
    openProject: vi.fn().mockResolvedValue(project),
    openProjectAt: vi.fn().mockResolvedValue(project),
    listTree: vi.fn().mockResolvedValue([readmeNode]),
    readFile: vi.fn().mockResolvedValue('# Notes'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    closeProject: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function pressCommandPaletteShortcut() {
  fireEvent.keyDown(window, { key: 'P', ctrlKey: true, shiftKey: true })
}

async function openAProject(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /abrir projeto/i }))
  await screen.findByText('README.md')
}

describe('App overlays: Settings and Command Palette wiring', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().reset()
    localStorage.clear()
  })

  it('opens the command palette with Ctrl+Shift+P from the welcome view', () => {
    render(<App api={createApi()} />)

    pressCommandPaletteShortcut()

    expect(screen.getByRole('dialog', { name: 'Paleta de comandos' })).toBeInTheDocument()
  })

  it('the command palette includes an item that opens Settings', async () => {
    const user = userEvent.setup()
    render(<App api={createApi()} />)

    pressCommandPaletteShortcut()
    await user.click(screen.getByRole('button', { name: /abrir configurações/i }))

    expect(screen.getByRole('dialog', { name: /configurações/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Paleta de comandos' })).not.toBeInTheDocument()
  })

  it('opens Settings from the ActivityBar button once a project is open', async () => {
    const user = userEvent.setup()
    render(<App api={createApi()} />)
    await openAProject(user)

    await user.click(screen.getByRole('button', { name: 'Configurações' }))

    expect(screen.getByRole('dialog', { name: /configurações/i })).toBeInTheDocument()
  })

  it('opens the command palette from the ActivityBar button once a project is open', async () => {
    const user = userEvent.setup()
    render(<App api={createApi()} />)
    await openAProject(user)

    await user.click(screen.getByRole('button', { name: /paleta de comandos/i }))

    expect(screen.getByRole('dialog', { name: 'Paleta de comandos' })).toBeInTheDocument()
  })

  it('does not stack the command palette on top of an already-open Settings dialog', async () => {
    const user = userEvent.setup()
    render(<App api={createApi()} />)
    await openAProject(user)

    await user.click(screen.getByRole('button', { name: 'Configurações' }))
    expect(screen.getByRole('dialog', { name: /configurações/i })).toBeInTheDocument()

    // Ctrl+Shift+P is handled by a global window keydown listener, so it fires even though the
    // ActivityBar button behind the Settings backdrop cannot be clicked. Before the fix this
    // opened a second, independent overlay on top of Settings.
    pressCommandPaletteShortcut()

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: /configurações/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Paleta de comandos' })).not.toBeInTheDocument()
  })

  it('opens the command palette with Ctrl+Shift+P once Settings has been closed', async () => {
    const user = userEvent.setup()
    render(<App api={createApi()} />)
    await openAProject(user)

    await user.click(screen.getByRole('button', { name: 'Configurações' }))
    await user.click(screen.getByRole('button', { name: 'Fechar configurações' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    pressCommandPaletteShortcut()

    expect(screen.getByRole('dialog', { name: 'Paleta de comandos' })).toBeInTheDocument()
  })

  it('a single Escape press closes only the one overlay that is open', async () => {
    const user = userEvent.setup()
    render(<App api={createApi()} />)
    await openAProject(user)

    await user.click(screen.getByRole('button', { name: 'Configurações' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
