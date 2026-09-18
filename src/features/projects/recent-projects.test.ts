import { beforeEach, describe, expect, it } from 'vitest'
import { addRecentProject, getRecentProjects, removeRecentProject } from './recent-projects'

describe('recent-projects', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns an empty array initially', () => {
    expect(getRecentProjects()).toEqual([])
  })

  it('adds a project and returns it from getRecentProjects', () => {
    addRecentProject({ name: 'Docs', rootPath: '/home/user/docs' })

    const projects = getRecentProjects()
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('Docs')
    expect(projects[0].rootPath).toBe('/home/user/docs')
    expect(typeof projects[0].lastOpenedAt).toBe('number')
  })

  it('dedupes by rootPath, moving the existing entry to the front instead of duplicating it', () => {
    addRecentProject({ name: 'Docs', rootPath: '/home/user/docs' })
    addRecentProject({ name: 'Notes', rootPath: '/home/user/notes' })
    addRecentProject({ name: 'Docs', rootPath: '/home/user/docs' })

    const projects = getRecentProjects()
    expect(projects).toHaveLength(2)
    expect(projects[0].rootPath).toBe('/home/user/docs')
    expect(projects[1].rootPath).toBe('/home/user/notes')
  })

  it('caps the list at 8 entries, dropping the oldest', () => {
    for (let i = 1; i <= 9; i += 1) {
      addRecentProject({ name: `Project ${i}`, rootPath: `/projects/${i}` })
    }

    const projects = getRecentProjects()
    expect(projects).toHaveLength(8)
    expect(projects.map((project) => project.rootPath)).not.toContain('/projects/1')
    expect(projects[0].rootPath).toBe('/projects/9')
    expect(projects[7].rootPath).toBe('/projects/2')
  })

  it('removes only the matching entry', () => {
    addRecentProject({ name: 'Docs', rootPath: '/home/user/docs' })
    addRecentProject({ name: 'Notes', rootPath: '/home/user/notes' })

    removeRecentProject('/home/user/docs')

    const projects = getRecentProjects()
    expect(projects).toHaveLength(1)
    expect(projects[0].rootPath).toBe('/home/user/notes')
  })
})
