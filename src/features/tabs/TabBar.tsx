import type { DocumentTab, ProjectEntry } from '../../types/project'

export interface TabBarProps {
  tabs: DocumentTab[]
  activeTabPath: string | null
  projects: ProjectEntry[]
  onActivateTab: (path: string) => void
  onCloseTab: (path: string) => void
}

function projectNameFor(rootPath: string, projects: ProjectEntry[]): string | null {
  return projects.find((entry) => entry.info.rootPath === rootPath)?.info.name ?? null
}

function labelFor(tab: DocumentTab, tabs: DocumentTab[], projects: ProjectEntry[]): string {
  const hasCollision = tabs.some((other) => other !== tab && other.name === tab.name)
  if (!hasCollision) {
    return tab.name
  }

  const projectName = projectNameFor(tab.rootPath, projects)
  return projectName ? `${tab.name} — ${projectName}` : tab.name
}

export function TabBar({ tabs, activeTabPath, projects, onActivateTab, onCloseTab }: TabBarProps) {
  return (
    <div className="tab-bar" role="tablist" aria-label="Abas de arquivos abertos">
      {tabs.map((tab) => {
        const isActive = tab.path === activeTabPath
        const label = labelFor(tab, tabs, projects)

        return (
          <div
            key={tab.path}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            aria-selected={isActive}
            title={tab.path}
            className={isActive ? 'tab-bar__tab tab-bar__tab--active' : 'tab-bar__tab'}
            onClick={() => onActivateTab(tab.path)}
          >
            <span className="tab-bar__label">{label}</span>
            {tab.isDirty ? (
              <span className="tab-bar__dirty">
                <span aria-hidden="true">●</span>
                <span className="sr-only">Alterações não salvas</span>
              </span>
            ) : null}
            <button
              type="button"
              className="tab-bar__close"
              aria-label={`Fechar ${label}`}
              onClick={(event) => {
                event.stopPropagation()
                onCloseTab(tab.path)
              }}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
