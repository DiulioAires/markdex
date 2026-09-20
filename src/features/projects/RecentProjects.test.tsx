import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecentProjects } from './RecentProjects'
import { getRecentProjects, removeRecentProject } from './recent-projects'

vi.mock('./recent-projects', () => ({
  getRecentProjects: vi.fn(),
  removeRecentProject: vi.fn(),
}))

const mockedGetRecentProjects = vi.mocked(getRecentProjects)
const mockedRemoveRecentProject = vi.mocked(removeRecentProject)

describe('RecentProjects', () => {
  beforeEach(() => {
    mockedGetRecentProjects.mockReset()
    mockedRemoveRecentProject.mockReset()
  })

  it('renders nothing when there are no recent projects', () => {
    mockedGetRecentProjects.mockReturnValue([])

    const { container } = render(<RecentProjects onOpen={() => {}} />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('Recentes')).not.toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('renders each entry name and path when there are entries', () => {
    mockedGetRecentProjects.mockReturnValue([
      { name: 'Docs', rootPath: '/home/user/docs', lastOpenedAt: 1 },
      { name: 'Notes', rootPath: '/home/user/notes', lastOpenedAt: 2 },
    ])

    render(<RecentProjects onOpen={() => {}} />)

    expect(screen.getByText('Docs')).toBeInTheDocument()
    expect(screen.getByText('/home/user/docs')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('/home/user/notes')).toBeInTheDocument()
  })

  it('calls onOpen with the rootPath when clicking the row main area', async () => {
    mockedGetRecentProjects.mockReturnValue([
      { name: 'Docs', rootPath: '/home/user/docs', lastOpenedAt: 1 },
    ])
    const onOpen = vi.fn()
    const user = userEvent.setup()

    render(<RecentProjects onOpen={onOpen} />)
    await user.click(screen.getByText('Docs'))

    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenCalledWith('/home/user/docs')
  })

  it('clicking the remove button does not call onOpen and calls removeRecentProject', async () => {
    mockedGetRecentProjects.mockReturnValue([
      { name: 'Docs', rootPath: '/home/user/docs', lastOpenedAt: 1 },
    ])
    const onOpen = vi.fn()
    const user = userEvent.setup()

    render(<RecentProjects onOpen={onOpen} />)
    await user.click(screen.getByRole('button', { name: 'Remover Docs dos recentes' }))

    expect(onOpen).not.toHaveBeenCalled()
    expect(mockedRemoveRecentProject).toHaveBeenCalledWith('/home/user/docs')
  })

  it('is keyboard-operable: focusing the row and pressing Enter or Space calls onOpen', async () => {
    mockedGetRecentProjects.mockReturnValue([
      { name: 'Docs', rootPath: '/home/user/docs', lastOpenedAt: 1 },
    ])
    const onOpen = vi.fn()
    const user = userEvent.setup()

    render(<RecentProjects onOpen={onOpen} />)
    const row = screen.getByText('Docs').closest('li')
    expect(row).toHaveAttribute('role', 'button')
    expect(row).toHaveAttribute('tabIndex', '0')
    ;(row as HTMLLIElement).focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')

    expect(onOpen).toHaveBeenCalledTimes(2)
    expect(onOpen).toHaveBeenCalledWith('/home/user/docs')
  })

  it('pressing Enter on the remove button only removes, it does not also call onOpen', async () => {
    mockedGetRecentProjects.mockReturnValue([
      { name: 'Docs', rootPath: '/home/user/docs', lastOpenedAt: 1 },
    ])
    const onOpen = vi.fn()
    const user = userEvent.setup()

    render(<RecentProjects onOpen={onOpen} />)
    const removeButton = screen.getByRole('button', { name: 'Remover Docs dos recentes' })
    removeButton.focus()
    await user.keyboard('{Enter}')

    expect(onOpen).not.toHaveBeenCalled()
    expect(mockedRemoveRecentProject).toHaveBeenCalledWith('/home/user/docs')
  })
})
