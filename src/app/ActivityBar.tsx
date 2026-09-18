import { Columns2, Eye, FolderOpen, Pencil, Search, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconButton } from '../components/ui/IconButton'
import type { ViewMode } from '../types/project'

export interface ActivityBarProps {
  viewMode: ViewMode
  onSelectViewMode: (viewMode: ViewMode) => void
  onOpenProject: () => void
  isOpening: boolean
  onOpenCommandPalette?: () => void
  onOpenSettings?: () => void
}

const VIEW_MODES: { mode: ViewMode; label: string; icon: ReactNode }[] = [
  { mode: 'editor', label: 'Modo edição', icon: <Pencil size={16} aria-hidden="true" /> },
  { mode: 'preview', label: 'Modo visualização', icon: <Eye size={16} aria-hidden="true" /> },
  { mode: 'split', label: 'Modo dividido', icon: <Columns2 size={16} aria-hidden="true" /> },
]

export function ActivityBar({
  viewMode,
  onSelectViewMode,
  onOpenProject,
  isOpening,
  onOpenCommandPalette,
  onOpenSettings,
}: ActivityBarProps) {
  return (
    <nav className="activity-bar" aria-label="Barra de atividade">
      <IconButton
        label="Abrir projeto"
        icon={<FolderOpen size={16} aria-hidden="true" />}
        onClick={onOpenProject}
        disabled={isOpening}
      />
      <div className="activity-bar__divider" role="separator" aria-hidden="true" />
      {VIEW_MODES.map(({ mode, label, icon }) => (
        <IconButton
          key={mode}
          label={label}
          icon={icon}
          active={viewMode === mode}
          onClick={() => onSelectViewMode(mode)}
        />
      ))}
      <div className="activity-bar__spacer" />
      <IconButton
        label="Paleta de comandos (Ctrl+Shift+P)"
        icon={<Search size={16} aria-hidden="true" />}
        onClick={onOpenCommandPalette}
      />
      <IconButton
        label="Configurações"
        icon={<Settings size={16} aria-hidden="true" />}
        onClick={onOpenSettings}
      />
    </nav>
  )
}
