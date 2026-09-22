const STORAGE_KEY = 'markdex:recent-files'
const MAX_ENTRIES = 20

export interface RecentFile {
  name: string
  path: string
  relativePath: string
  rootPath: string
  lastEditedAt: number
}

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((listener) => listener())
}

export function subscribeToRecentFiles(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function readAll(): RecentFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry) => entry && typeof entry.path === 'string') as RecentFile[]
  } catch {
    return []
  }
}

function writeAll(files: RecentFile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files))
  } catch {
    // Storage can be unavailable in restricted WebView contexts.
  }
  notify()
}

export function getRecentFiles(rootPath?: string): RecentFile[] {
  const files = readAll().sort((left, right) => right.lastEditedAt - left.lastEditedAt)
  return rootPath ? files.filter((file) => file.rootPath === rootPath) : files
}

export function recordRecentFile(file: Omit<RecentFile, 'lastEditedAt'>): void {
  const existing = readAll().filter((entry) => entry.path !== file.path)
  writeAll([{ ...file, lastEditedAt: Date.now() }, ...existing].slice(0, MAX_ENTRIES))
}
