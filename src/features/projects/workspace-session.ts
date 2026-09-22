const STORAGE_KEY = 'markdex:workspace-session'

export interface WorkspaceSession {
  projectRoots: string[]
}

export function loadWorkspaceSession(): WorkspaceSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    const candidates: unknown[] = Array.isArray(parsed?.projectRoots) ? parsed.projectRoots : []
    const roots = candidates.filter((value): value is string => typeof value === 'string')
    return { projectRoots: [...new Set(roots)] }
  } catch {
    return { projectRoots: [] }
  }
}

export function saveWorkspaceSession(projectRoots: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ projectRoots: [...new Set(projectRoots)] }))
  } catch {
    // Storage can be unavailable in restricted environments; session restore is best effort.
  }
}
