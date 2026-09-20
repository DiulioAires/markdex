const STORAGE_KEY = 'markdex:recent-projects'
const MAX_ENTRIES = 8

export interface RecentProject {
  name: string
  rootPath: string
  lastOpenedAt: number
}

type Listener = () => void

// Components (e.g. RecentProjects) read this storage once on mount, but other code (e.g. the
// project controller, after a failed openProjectAt) can also write to it. Listeners let those
// already-rendered components stay in sync instead of going stale until a remount.
const listeners = new Set<Listener>()

function notifyListeners(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeToRecentProjects(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function readAll(): RecentProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RecentProject[]) : []
  } catch {
    return []
  }
}

function writeAll(projects: RecentProject[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch {
    // Ignore storage failures (unavailable, quota exceeded, etc.)
  } finally {
    notifyListeners()
  }
}

export function getRecentProjects(): RecentProject[] {
  return readAll()
}

export function addRecentProject(info: { name: string; rootPath: string }): void {
  const existing = readAll().filter((project) => project.rootPath !== info.rootPath)
  const next: RecentProject = {
    name: info.name,
    rootPath: info.rootPath,
    lastOpenedAt: Date.now(),
  }
  writeAll([next, ...existing].slice(0, MAX_ENTRIES))
}

export function removeRecentProject(rootPath: string): void {
  writeAll(readAll().filter((project) => project.rootPath !== rootPath))
}
