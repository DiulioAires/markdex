import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { useWorkspaceStore } from '../stores/workspace-store'
import { useSettingsStore } from '../stores/settings-store'
import type { NativeApi } from '../lib/native-api'

const firstProject = { name: 'First', rootPath: 'C:\\first' }
const secondProject = { name: 'Second', rootPath: 'C:\\second' }

function createApi(): NativeApi {
  return {
    openProject: vi.fn().mockResolvedValueOnce(firstProject).mockResolvedValueOnce(secondProject),
    openProjectAt: vi.fn(async (rootPath: string) => rootPath === firstProject.rootPath ? firstProject : secondProject),
    listTree: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
    closeProject: vi.fn().mockResolvedValue(undefined),
  }
}

describe('App', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().reset()
    useSettingsStore.getState().setSessionStartupMode('ask')
    localStorage.removeItem('markdex:session')
  })

  it('shows the product name and the open-project action', () => {
    render(<App />)
    expect(screen.getByText('Markdex')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /abrir projeto/i })).toBeInTheDocument()
  })

  it('uses a distinct folder-selection icon for adding a project', async () => {
    const user = userEvent.setup()
    render(<App api={createApi()} />)
    await user.click(screen.getByRole('button', { name: 'Abrir projeto' }))
    await screen.findAllByText('First')

    const addProjectButton = screen.getByRole('button', { name: 'Adicionar projeto' })
    expect(addProjectButton.querySelector('svg')).toHaveClass('lucide-folder-input')
  })

  it('renders two added projects without replacing the first one', async () => {
    const user = userEvent.setup()
    render(<App api={createApi()} />)

    await user.click(screen.getByRole('button', { name: 'Abrir projeto' }))
    await waitFor(() => expect(screen.getAllByText('First').length).toBeGreaterThan(0))
    const addProject = screen.getByRole('button', { name: /adicionar projeto/i })
    await user.click(addProject)
    await waitFor(() => expect(screen.getAllByText('Second').length).toBeGreaterThan(0))

    expect(screen.getAllByText('First').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Second').length).toBeGreaterThan(0)
  })

  it('does not run automatic full-tree scans for already-open projects', async () => {
    vi.useFakeTimers()
    const api = createApi()
    useWorkspaceStore.getState().addProject({
      info: firstProject,
      tree: [],
      isExpanded: true,
      isLoadingTree: false,
      treeError: null,
    })
    const view = render(<App api={api} />)

    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500)
      })
      expect(api.listTree).not.toHaveBeenCalled()
    } finally {
      view.unmount()
      vi.useRealTimers()
    }
  })

  it('asks whether to restore the saved session and preserves it when starting empty', async () => {
    const user = userEvent.setup()
    const api = createApi()
    localStorage.setItem('markdex:session', JSON.stringify({
      projects: [firstProject],
      activeProjectRootPath: firstProject.rootPath,
      activeFilePath: null,
    }))

    render(<App api={api} />)

    expect(await screen.findByRole('dialog', { name: 'Restaurar última sessão?' })).toBeInTheDocument()
    expect(api.openProjectAt).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Iniciar sem restaurar' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Restaurar última sessão?' })).not.toBeInTheDocument())
    expect(api.openProjectAt).not.toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem('markdex:session') ?? '{}').projects).toEqual([firstProject])
  })

  it('restores the saved project after confirmation', async () => {
    const user = userEvent.setup()
    const api = createApi()
    localStorage.setItem('markdex:session', JSON.stringify({
      projects: [firstProject],
      activeProjectRootPath: firstProject.rootPath,
      activeFilePath: null,
    }))

    render(<App api={api} />)

    await user.click(await screen.findByRole('button', { name: 'Restaurar sessão' }))

    await waitFor(() => expect(api.openProjectAt).toHaveBeenCalledWith(firstProject.rootPath))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Restaurar última sessão?' })).not.toBeInTheDocument())
    expect(await screen.findAllByText('First')).not.toHaveLength(0)
  })

  it('restores automatically when that startup mode is selected', async () => {
    useSettingsStore.getState().setSessionStartupMode('restore')
    const api = createApi()
    localStorage.setItem('markdex:session', JSON.stringify({
      projects: [firstProject],
      activeProjectRootPath: firstProject.rootPath,
      activeFilePath: null,
    }))

    render(<App api={api} />)

    await waitFor(() => expect(api.openProjectAt).toHaveBeenCalledWith(firstProject.rootPath))
    expect(screen.queryByRole('dialog', { name: 'Restaurar última sessão?' })).not.toBeInTheDocument()
  })

  it('chooses the last project that restored successfully when the saved active path is missing', async () => {
    useSettingsStore.getState().setSessionStartupMode('restore')
    useSettingsStore.getState().setStartupProject('last')
    const missingProject = { name: 'Removed', rootPath: 'C:\\removed' }
    const api = createApi()
    vi.mocked(api.openProjectAt).mockImplementation(async (rootPath) => {
      if (rootPath === missingProject.rootPath) throw new Error('pasta não encontrada')
      return secondProject
    })
    localStorage.setItem('markdex:session', JSON.stringify({
      projects: [missingProject, secondProject],
      activeProjectRootPath: missingProject.rootPath,
      activeFilePath: null,
    }))

    render(<App api={api} />)
    await waitFor(() => expect(api.openProjectAt).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(useWorkspaceStore.getState().activeProjectRootPath).toBe(secondProject.rootPath))
    expect(useWorkspaceStore.getState().projects.map((project) => project.info.rootPath)).toEqual([secondProject.rootPath])
  })

  it('does not restore or ask when startup is configured to start empty', () => {
    useSettingsStore.getState().setSessionStartupMode('empty')
    const api = createApi()
    localStorage.setItem('markdex:session', JSON.stringify({
      projects: [firstProject],
      activeProjectRootPath: firstProject.rootPath,
      activeFilePath: null,
    }))

    render(<App api={api} />)

    expect(api.openProjectAt).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'Restaurar última sessão?' })).not.toBeInTheDocument()
  })
})
