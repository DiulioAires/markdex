import { render, screen, waitFor } from '@testing-library/react'
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
    openProjectAt: vi.fn(),
    listTree: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
    closeProject: vi.fn().mockResolvedValue(undefined),
  }
}

describe('App', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().reset()
    useSettingsStore.getState().setRestoreLastSession(false)
  })

  it('shows the product name and the open-project action', () => {
    render(<App />)
    expect(screen.getByText('Markdex')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /abrir projeto/i })).toBeInTheDocument()
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
})
