import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecentProjects } from './RecentProjects'
import { getRecentProjects, removeRecentProject, subscribeToRecentProjects } from './recent-projects'

vi.mock('./recent-projects', () => ({
  getRecentProjects: vi.fn(),
  removeRecentProject: vi.fn(),
  subscribeToRecentProjects: vi.fn(() => () => {}),
}))

const mockedGetRecentProjects = vi.mocked(getRecentProjects)
const mockedRemoveRecentProject = vi.mocked(removeRecentProject)
const mockedSubscribeToRecentProjects = vi.mocked(subscribeToRecentProjects)

describe('RecentProjects', () => {
  beforeEach(() => {
    mockedGetRecentProjects.mockReset()
    mockedRemoveRecentProject.mockReset()
    mockedSubscribeToRecentProjects.mockReset()
    mockedSubscribeToRecentProjects.mockReturnValue(() => {})
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

  it('updates the rendered list when notified of a change made outside the component', () => {
    mockedGetRecentProjects.mockReturnValue([
      { name: 'Docs', rootPath: '/home/user/docs', lastOpenedAt: 1 },
      { name: 'Notes', rootPath: '/home/user/notes', lastOpenedAt: 2 },
    ])

    render(<RecentProjects onOpen={() => {}} />)

    expect(screen.getByText('Docs')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(mockedSubscribeToRecentProjects).toHaveBeenCalledTimes(1)

    // Simulate the project controller removing a stale entry (e.g. after openProjectAt fails)
    // by calling the listener the component registered, the same way the real
    // subscribeToRecentProjects/notifyListeners pair would.
    const externalListener = mockedSubscribeToRecentProjects.mock.calls[0][0]
    mockedGetRecentProjects.mockReturnValue([
      { name: 'Notes', rootPath: '/home/user/notes', lastOpenedAt: 2 },
    ])

    act(() => {
      externalListener()
    })

    expect(screen.queryByText('Docs')).not.toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })

  it('unsubscribes on unmount', () => {
    mockedGetRecentProjects.mockReturnValue([
      { name: 'Docs', rootPath: '/home/user/docs', lastOpenedAt: 1 },
    ])
    const unsubscribe = vi.fn()
    mockedSubscribeToRecentProjects.mockReturnValue(unsubscribe)

    const { unmount } = render(<RecentProjects onOpen={() => {}} />)
    unmount()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
