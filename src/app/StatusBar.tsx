export interface StatusBarProps {
  projectName: string | null
  fileType: string | null
  cursor: { line: number; column: number } | null
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
}

export function StatusBar({ projectName, fileType, cursor, isDirty, isSaving, onSave }: StatusBarProps) {
  const savedLabel = isSaving ? 'Salvando…' : isDirty ? 'Alterações não salvas' : 'Salvo'

  return (
    <footer className="status-bar" role="contentinfo" aria-label="Barra de status">
      <span className="status-bar__item">{projectName ?? 'Nenhum projeto aberto'}</span>
      <span className="status-bar__spacer" />
      {fileType ? <span className="status-bar__item">{fileType}</span> : null}
      {cursor ? (
        <span className="status-bar__item">
          Ln {cursor.line}, Col {cursor.column}
        </span>
      ) : null}
      <span
        className="status-bar__item"
        data-dirty={isDirty || undefined}
        aria-live="polite"
      >
        {savedLabel}
      </span>
      <button
        type="button"
        className="status-bar__save"
        onClick={onSave}
        disabled={!isDirty || isSaving}
      >
        Salvar
      </button>
    </footer>
  )
}
