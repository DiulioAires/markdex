const STORAGE_KEY = 'md-project-manager:recent-projects'
const MAX_ENTRIES = 8

export interface RecentProject {
  name: string
  rootPath: string
  lastOpenedAt: number
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
