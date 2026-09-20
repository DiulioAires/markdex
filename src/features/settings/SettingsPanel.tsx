import { Settings, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import type { EditorFontSize } from '../../stores/settings-store'

export interface SettingsPanelProps {
  onClose: () => void
}

const FONT_SIZE_OPTIONS: { value: EditorFontSize; label: string }[] = [
  { value: 'small', label: 'Pequena' },
  { value: 'medium', label: 'Média' },
  { value: 'large', label: 'Grande' },
]

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: 'Ctrl+O', description: 'Abrir projeto' },
  { keys: 'Ctrl+S', description: 'Salvar arquivo' },
  { keys: 'Ctrl+Shift+P', description: 'Paleta de comandos' },
]

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const editorFontSize = useSettingsStore((state) => state.editorFontSize)
  const setEditorFontSize = useSettingsStore((state) => state.setEditorFontSize)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settings-panel__header">
          <h2 className="settings-panel__title" id="settings-panel-title">
            <Settings size={20} aria-hidden="true" />
            Configurações
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="settings-panel__close"
            onClick={onClose}
            aria-label="Fechar configurações"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <section className="settings-panel__section">
          <h3 className="settings-panel__section-title">Aparência</h3>
          <div className="settings-panel__field">
            <span className="settings-panel__label" id="editor-font-size-label">
              Tamanho da fonte do editor
            </span>
            <div
              className="settings-panel__button-group"
              role="group"
              aria-labelledby="editor-font-size-label"
            >
              {FONT_SIZE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={editorFontSize === value}
                  className={
                    editorFontSize === value
                      ? 'settings-panel__button settings-panel__button--active'
                      : 'settings-panel__button'
                  }
                  onClick={() => setEditorFontSize(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-panel__section">
          <h3 className="settings-panel__section-title">Atalhos de teclado</h3>
          <ul className="settings-panel__shortcuts">
            {SHORTCUTS.map(({ keys, description }) => (
              <li key={keys} className="settings-panel__shortcut">
                <kbd>{keys}</kbd>
                <span>{description}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="settings-panel__section">
          <h3 className="settings-panel__section-title">Sobre</h3>
          <p className="settings-panel__about-name">Markdex</p>
          <p className="settings-panel__about-version">Versão 1.0.0</p>
          <p className="settings-panel__about-description">
            Um editor para organizar e escrever os arquivos Markdown de um projeto local, sem
            sincronização automática ou integrações externas.
          </p>
        </section>
      </div>
    </div>
  )
}
