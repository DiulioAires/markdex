import { FolderOpen } from 'lucide-react'

export interface WelcomeViewProps {
  onOpenProject: () => void
  isOpening: boolean
}

export function WelcomeView({ onOpenProject, isOpening }: WelcomeViewProps) {
  return (
    <section className="welcome-view" aria-label="Tela inicial">
      <div className="welcome-view__card">
        <h1 className="welcome-view__title">MD Project Manager</h1>
        <p className="welcome-view__tagline">
          Abra uma pasta local para navegar, editar e visualizar seus arquivos Markdown.
        </p>
        <button
          type="button"
          className="welcome-view__action"
          onClick={onOpenProject}
          disabled={isOpening}
        >
          {isOpening ? (
            'Abrindo projeto…'
          ) : (
            <>
              <FolderOpen size={16} aria-hidden="true" />
              Abrir projeto
            </>
          )}
        </button>
        <p className="welcome-view__hint">
          Atalho: <kbd>Ctrl + O</kbd>
        </p>
      </div>
    </section>
  )
}
