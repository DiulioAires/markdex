export interface SessionRestorePromptProps {
  isRestoring: boolean
  onRestore: () => void
  onStartEmpty: () => void
}

export function SessionRestorePrompt({ isRestoring, onRestore, onStartEmpty }: SessionRestorePromptProps) {
  return (
    <div className="overlay-backdrop session-restore-backdrop">
      <section className="session-restore-dialog" role="dialog" aria-modal="true" aria-labelledby="session-restore-title">
        <h2 id="session-restore-title">Restaurar última sessão?</h2>
        <p>Você pode continuar de onde parou ou iniciar com uma janela vazia.</p>
        {isRestoring ? (
          <div className="project-home__loading" role="status">
            <span className="project-home__progress-track" role="progressbar" aria-label="Restaurando sessão">
              <span className="project-home__progress-bar" />
            </span>
            <span>Restaurando projetos…</span>
          </div>
        ) : null}
        <div className="session-restore-dialog__actions">
          <button type="button" className="settings-panel__button" onClick={onStartEmpty} disabled={isRestoring}>
            Iniciar sem restaurar
          </button>
          <button type="button" className="settings-panel__button settings-panel__button--active" onClick={onRestore} disabled={isRestoring}>
            Restaurar sessão
          </button>
        </div>
      </section>
    </div>
  )
}
