import type { ViewMode } from '../../types/project'

export interface ViewModeSwitchProps {
  viewMode: ViewMode
  onChange: (viewMode: ViewMode) => void
}

const OPTIONS: { mode: ViewMode; label: string }[] = [
  { mode: 'editor', label: 'Editor' },
  { mode: 'preview', label: 'Preview' },
  { mode: 'split', label: 'Dividido' },
]

export function ViewModeSwitch({ viewMode, onChange }: ViewModeSwitchProps) {
  return (
    <div className="view-mode-switch" role="group" aria-label="Modo de visualização">
      {OPTIONS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={viewMode === mode}
          className={
            viewMode === mode ? 'view-mode-switch__button view-mode-switch__button--active' : 'view-mode-switch__button'
          }
          onClick={() => onChange(mode)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
