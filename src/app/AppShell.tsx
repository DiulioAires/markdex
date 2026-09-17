import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ActivityBar } from './ActivityBar'
import { StatusBar } from './StatusBar'
import type { ViewMode } from '../types/project'

const MIN_EXPLORER_WIDTH = 180
const MAX_EXPLORER_WIDTH = 480
const DEFAULT_EXPLORER_WIDTH = 260
const RESIZE_STEP = 16

function clampExplorerWidth(width: number): number {
  return Math.min(MAX_EXPLORER_WIDTH, Math.max(MIN_EXPLORER_WIDTH, width))
}

export interface AppShellProps {
  viewMode: ViewMode
  onSelectViewMode: (viewMode: ViewMode) => void
  onOpenProject: () => void
  isOpening: boolean
  projectName: string | null
  fileType: string | null
  cursor: { line: number; column: number } | null
  isDirty: boolean
  isSaving: boolean
  explorerSlot: ReactNode
  workspaceSlot: ReactNode
}

export function AppShell({
  viewMode,
  onSelectViewMode,
  onOpenProject,
  isOpening,
  projectName,
  fileType,
  cursor,
  isDirty,
  isSaving,
  explorerSlot,
  workspaceSlot,
}: AppShellProps) {
  const [explorerWidth, setExplorerWidth] = useState(DEFAULT_EXPLORER_WIDTH)
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null)

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const drag = dragState.current
    if (!drag) return
    const delta = event.clientX - drag.startX
    setExplorerWidth(clampExplorerWidth(drag.startWidth + delta))
  }, [])

  const stopDragging = useCallback(() => {
    dragState.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopDragging)
  }, [handlePointerMove])

  const startDragging = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      dragState.current = { startX: event.clientX, startWidth: explorerWidth }
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', stopDragging)
    },
    [explorerWidth, handlePointerMove, stopDragging],
  )

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setExplorerWidth((width) => clampExplorerWidth(width - RESIZE_STEP))
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      setExplorerWidth((width) => clampExplorerWidth(width + RESIZE_STEP))
    }
  }, [])

  return (
    <div className="app-shell">
      <ActivityBar
        viewMode={viewMode}
        onSelectViewMode={onSelectViewMode}
        onOpenProject={onOpenProject}
        isOpening={isOpening}
      />
      <div className="app-shell__body">
        <aside
          className="app-shell__explorer"
          style={{ width: explorerWidth }}
          aria-label="Explorador de arquivos"
        >
          {explorerSlot}
        </aside>
        <div
          className="app-shell__resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar explorador"
          aria-valuemin={MIN_EXPLORER_WIDTH}
          aria-valuemax={MAX_EXPLORER_WIDTH}
          aria-valuenow={explorerWidth}
          tabIndex={0}
          onPointerDown={startDragging}
          onKeyDown={handleKeyDown}
        />
        <main className="app-shell__workspace" aria-label="Área de trabalho">
          {workspaceSlot}
        </main>
      </div>
      <StatusBar
        projectName={projectName}
        fileType={fileType}
        cursor={cursor}
        isDirty={isDirty}
        isSaving={isSaving}
      />
    </div>
  )
}
