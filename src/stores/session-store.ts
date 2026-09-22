import type { ProjectInfo } from '../types/project'

const STORAGE_KEY = 'markdex:session'

export interface PersistedSession {
  projects: ProjectInfo[]
  activeProjectRootPath: string | null
  activeFilePath: string | null
}

const EMPTY_SESSION: PersistedSession = {
  projects: [],
  activeProjectRootPath: null,
  activeFilePath: null,
}

export function readSession(): PersistedSession {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!parsed || !Array.isArray(parsed.projects)) return EMPTY_SESSION
    return {
      projects: parsed.projects.filter(
        (project: unknown): project is ProjectInfo =>
          Boolean(project) &&
          typeof project === 'object' &&
          typeof (project as ProjectInfo).name === 'string' &&
          typeof (project as ProjectInfo).rootPath === 'string',
      ),
      activeProjectRootPath:
        typeof parsed.activeProjectRootPath === 'string' ? parsed.activeProjectRootPath : null,
      activeFilePath: typeof parsed.activeFilePath === 'string' ? parsed.activeFilePath : null,
    }
  } catch {
    return EMPTY_SESSION
  }
}

export function writeSession(session: PersistedSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Ignore unavailable storage; the current runtime remains usable.
  }
}
