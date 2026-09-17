import { IconButton } from '../components/ui/IconButton'
import type { ViewMode } from '../types/project'

export interface ActivityBarProps {
  viewMode: ViewMode
  onSelectViewMode: (viewMode: ViewMode) => void
  onOpenProject: () => void
  isOpening: boolean
}

const VIEW_MODES: { mode: ViewMode; label: string; glyph: string }[] = [
  { mode: 'editor', label: 'Modo edição', glyph: 'E' },
  { mode: 'preview', label: 'Modo visualização', glyph: 'P' },
  { mode: 'split', label: 'Modo dividido', glyph: 'S' },
]

export function ActivityBar({
  viewMode,
  onSelectViewMode,
  onOpenProject,
  isOpening,
}: ActivityBarProps) {
  return (
    <nav className="activity-bar" aria-label="Barra de atividade">
      <IconButton
        label="Abrir projeto"
        icon="+"
        onClick={onOpenProject}
        disabled={isOpening}
      />
      <div className="activity-bar__divider" role="separator" aria-hidden="true" />
      {VIEW_MODES.map(({ mode, label, glyph }) => (
        <IconButton
          key={mode}
          label={label}
          icon={glyph}
          active={viewMode === mode}
          onClick={() => onSelectViewMode(mode)}
        />
      ))}
    </nav>
  )
}
