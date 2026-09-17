import type { DocumentTab } from '../../types/project'

export interface TabBarProps {
  tabs: DocumentTab[]
  activeTabPath: string | null
  onActivateTab: (path: string) => void
  onCloseTab: (path: string) => void
}

export function TabBar({ tabs, activeTabPath, onActivateTab, onCloseTab }: TabBarProps) {
  return (
    <div className="tab-bar" role="tablist" aria-label="Abas de arquivos abertos">
      {tabs.map((tab) => {
        const isActive = tab.path === activeTabPath

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
            <span className="tab-bar__label">{tab.name}</span>
            {tab.isDirty ? (
              <span className="tab-bar__dirty">
                <span aria-hidden="true">●</span>
                <span className="sr-only">Alterações não salvas</span>
              </span>
            ) : null}
            <button
              type="button"
              className="tab-bar__close"
              aria-label={`Fechar ${tab.name}`}
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
